const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conexiones de Base de Datos
const { poolPromise: sqlServerPool, sql } = require('./config/sqlServer');
const mysqlPool = require('./config/mysql');
const pgPool = require('./config/postgres');
const mongoose = require('./config/mongo');
const { firebaseConfig, isFirebaseConfigured } = require('./config/firebase');

// Módulos y Middlewares
const sportsRoutes = require('./modules/sports/sportsRoutes');
const bettingRoutes = require('./modules/betting/bettingRoutes');
const rulesRoutes = require('./modules/rules/rulesRoutes');
const paymentRoutes = require('./modules/payments/paymentRoutes');
const { generarToken } = require('./middlewares/authMiddleware');
const { Regla, MercadoApuesta, LoginAudit, defaultMercados, defaultReglas } = require('./modules/rules/mongoSchemas');

const app = express();
app.use(cors());
app.use(express.json());

// =====================================================================
// 1. HEALTHCHECK DIAGNÓSTICO (Monitoreo de todas las bases de datos)
// =====================================================================
app.get('/api/health', async (req, res) => {
    const health = {
        server: 'Online',
        timestamp: new Date().toISOString(),
        databases: {
            sqlServer: 'Desconectado',
            mySQL: 'Desconectado',
            postgreSQL: 'Desconectado',
            mongoDB: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
            firebase: isFirebaseConfigured ? `Conectado (${firebaseConfig.projectId})` : 'Desconectado',
        },
    };

    // Test SQL Server
    try {
        const pool = await sqlServerPool;
        if (pool) {
            await pool.request().query('SELECT 1');
            health.databases.sqlServer = 'Conectado';
        }
    } catch {
        health.databases.sqlServer = 'Error de conexión';
    }

    // Test MySQL
    try {
        if (mysqlPool) {
            await mysqlPool.query('SELECT 1');
            health.databases.mySQL = 'Conectado';
        }
    } catch {
        health.databases.mySQL = 'Error de conexión';
    }

    // Test PostgreSQL
    try {
        if (pgPool) {
            await pgPool.query('SELECT 1');
            health.databases.postgreSQL = 'Conectado';
        }
    } catch {
        health.databases.postgreSQL = 'Error de conexión';
    }

    res.json(health);
});

// =====================================================================
// 2. RUTAS MODULARES (Arquitectura Políglota)
// =====================================================================
app.use('/api/sports', sportsRoutes);     // MySQL: Deportes, Ligas, Equipos, Partidos
app.use('/api/betting', bettingRoutes);   // PostgreSQL: Cuentas, Billeteras, Apuestas
app.use('/api/rules', rulesRoutes);       // MongoDB: Reglas, Mercados, Logs
app.use('/api/payments', paymentRoutes);  // Pasarela PSE / Wompi Sandbox

// =====================================================================
// 2.1 ENDPOINT ORQUESTADOR MULTIBASE: GET /api/dashboard/:cedula
// Combina en Node.js (sin joins entre motores): SQL Server + MySQL + PostgreSQL + MongoDB
// =====================================================================
app.get('/api/dashboard/:cedula', async (req, res) => {
    const { cedula } = req.params;
    const responseData = {
        usuario: null,
        saldo: { cedula_usuario: cedula, saldo_disponible: 150000 },
        apuestasRecientes: [],
        proximosPartidos: [],
        mercados: defaultMercados,
        reglas: defaultReglas,
    };

    // 1. SQL Server: Usuario
    try {
        const pool = await sqlServerPool;
        if (pool) {
            const userRes = await pool
                .request()
                .input('cedula', sql.VarChar(20), cedula)
                .query('SELECT cedula, nombre_rol, nombre, apellido, correo, estado FROM usuario WHERE cedula = @cedula');
            if (userRes.recordset.length > 0) {
                responseData.usuario = userRes.recordset[0];
            }
        }
    } catch {
        // Fallback silencioso si SQL Server no responde
    }

    // 2. MySQL: Próximos partidos de la Liga BetPlay Dimayor
    try {
        if (mysqlPool) {
            const [matches] = await mysqlPool.query(
                `SELECT codigo_partido, codigo_jornada, equipo_local, equipo_visitante, fecha_hora, marcador_local, marcador_visitante, estado_partido
                 FROM partido
                 ORDER BY fecha_hora ASC
                 LIMIT 5`
            );
            responseData.proximosPartidos = matches;
        }
    } catch {
        // Fallback silencioso si MySQL no responde
    }

    // 3. PostgreSQL: Saldo y Apuestas Recientes
    try {
        if (pgPool) {
            const walletRes = await pgPool.query(
                'SELECT cedula_usuario, saldo_disponible, ultima_actualizacion FROM billetera WHERE cedula_usuario = $1',
                [cedula]
            );
            if (walletRes.rows.length > 0) {
                responseData.saldo = walletRes.rows[0];
            }

            const ticketsRes = await pgPool.query(
                `SELECT codigo_ticket, cedula_usuario, origen_fondos, monto_total, posible_ganancia_total, estado_ticket, fecha_emision
                 FROM ticket_apuesta
                 WHERE cedula_usuario = $1
                 ORDER BY fecha_emision DESC
                 LIMIT 5`,
                [cedula]
            );
            responseData.apuestasRecientes = ticketsRes.rows;
        }
    } catch {
        // Fallback silencioso si PostgreSQL no responde
    }

    // 4. MongoDB: Mercados y Reglas activas
    try {
        if (mongoose.connection.readyState === 1) {
            const [mercados, reglas] = await Promise.all([
                MercadoApuesta.find({ activo: true }),
                Regla.find(),
            ]);
            if (mercados.length > 0) responseData.mercados = mercados;
            if (reglas.length > 0) responseData.reglas = reglas;
        }
    } catch {
        // Usa defaults
    }

    res.json(responseData);
});

// =====================================================================
// 3. MÓDULO IDENTIDAD, ROLES, PERMISOS Y USUARIOS (SQL Server)
// =====================================================================

// 3.1 Obtener todos los usuarios con detalle de rol
app.get('/api/users', async (req, res) => {
    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');
        const result = await pool.request().query(`
            SELECT
                u.cedula,
                u.nombre_rol,
                r.descripcion AS descripcion_rol,
                u.nombre,
                u.apellido,
                u.correo,
                u.estado
            FROM usuario u
            LEFT JOIN rol r ON u.nombre_rol = r.nombre_rol
            ORDER BY u.nombre, u.apellido
        `);

        res.json(result.recordset.map((user) => ({
            ...user,
            name: `${user.nombre} ${user.apellido}`,
            email: user.correo,
            role: user.nombre_rol,
        })));
    } catch (error) {
        console.error('[Identity/SQL Server] Error al obtener usuarios:', error.message);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});

// 3.2 Obtener catálogo de roles y sus módulos permitidos (rol + permiso_rol + modulo_sistema)
app.get('/api/roles', async (req, res) => {
    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');

        const rolesResult = await pool.request().query(`
            SELECT nombre_rol, descripcion FROM rol ORDER BY nombre_rol
        `);

        const permisosResult = await pool.request().query(`
            SELECT 
                pr.nombre_rol,
                pr.nombre_modulo,
                ms.ruta_frontend
            FROM permiso_rol pr
            INNER JOIN modulo_sistema ms ON pr.nombre_modulo = ms.nombre_modulo
            ORDER BY pr.nombre_rol, pr.nombre_modulo
        `);

        const permisosPorRol = {};
        permisosResult.recordset.forEach((p) => {
            if (!permisosPorRol[p.nombre_rol]) permisosPorRol[p.nombre_rol] = [];
            permisosPorRol[p.nombre_rol].push({
                nombre_modulo: p.nombre_modulo,
                ruta_frontend: p.ruta_frontend,
            });
        });

        const roles = rolesResult.recordset.map((r) => ({
            ...r,
            permisos: permisosPorRol[r.nombre_rol] || [],
        }));

        res.json(roles);
    } catch (error) {
        console.error('[Identity/SQL Server] Error al obtener roles:', error.message);
        res.status(500).json({ message: 'Error al obtener roles y permisos.' });
    }
});

// 3.3 Obtener catálogo maestro de empresas (tabla empresa)
app.get('/api/empresas', async (req, res) => {
    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');

        const result = await pool.request().query(`
            SELECT nit, nombre, correo, telefono, direccion FROM empresa ORDER BY nombre
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[Identity/SQL Server] Error al obtener empresas:', error.message);
        res.status(500).json({ message: 'Error al obtener empresas.' });
    }
});

// Migración automática: cifra con bcrypt cualquier contraseña en texto plano existente en SQL Server
async function hashExistingPlainPasswords() {
    try {
        const pool = await sqlServerPool;
        if (!pool) return;
        const usersRes = await pool.request().query('SELECT cedula, [contraseña] FROM usuario');
        for (const row of usersRes.recordset) {
            const rawPass = String(row.contraseña || '');
            if (rawPass && !rawPass.startsWith('$2a$') && !rawPass.startsWith('$2b$')) {
                const hashed = await bcrypt.hash(rawPass, 10);
                await pool
                    .request()
                    .input('cedula', sql.VarChar(20), row.cedula)
                    .input('hash', sql.VarChar(255), hashed)
                    .query('UPDATE usuario SET [contraseña] = @hash WHERE cedula = @cedula');
            }
        }
    } catch (err) {
        console.error('[Identity/SQL Server] Error al verificar hashes de contraseñas:', err.message);
    }
}
hashExistingPlainPasswords();

// 3.4 Iniciar sesión validando contraseña hasheada con bcrypt, estado = 'Activo' y cargando permisos del rol
app.post('/api/auth/login', async (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
    }

    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');

        const result = await pool.request()
            .input('correo', sql.VarChar(100), correo)
            .query(`
                SELECT cedula, nombre_rol, nombre, apellido, correo, [contraseña], estado
                FROM usuario
                WHERE correo = @correo AND estado = 'Activo'
            `);

        let passwordValid = false;
        let dbUser = null;

        if (result.recordset.length > 0) {
            dbUser = result.recordset[0];
            const storedPass = String(dbUser.contraseña || '');
            const isBcryptHash = storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$');

            if (isBcryptHash) {
                passwordValid = await bcrypt.compare(String(contraseña), storedPass);
            } else if (storedPass === String(contraseña)) {
                passwordValid = true;
                // Si estaba en texto plano, la hashea inmediatamente en SQL Server
                const newHash = await bcrypt.hash(String(contraseña), 10);
                await pool.request()
                    .input('cedula', sql.VarChar(20), dbUser.cedula)
                    .input('hash', sql.VarChar(255), newHash)
                    .query('UPDATE usuario SET [contraseña] = @hash WHERE cedula = @cedula');
            }
        }

        if (!dbUser || !passwordValid) {
            if (mongoose.connection.readyState === 1) {
                await LoginAudit.create({
                    cedula_usuario: correo,
                    ip_conexion: req.ip || '127.0.0.1',
                    estado_intento: 'Fallido',
                    tipo_evento: 'LOGIN_FAILED',
                }).catch(() => {});
            }
            return res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo.' });
        }

        const loggedUser = {
            cedula: dbUser.cedula,
            nombre_rol: dbUser.nombre_rol,
            nombre: dbUser.nombre,
            apellido: dbUser.apellido,
            correo: dbUser.correo,
            estado: dbUser.estado,
        };

        // Consultar permisos del rol del usuario
        const permisosResult = await pool.request()
            .input('nombre_rol', sql.VarChar(50), loggedUser.nombre_rol)
            .query(`
                SELECT pr.nombre_modulo, ms.ruta_frontend
                FROM permiso_rol pr
                INNER JOIN modulo_sistema ms ON pr.nombre_modulo = ms.nombre_modulo
                WHERE pr.nombre_rol = @nombre_rol
            `);

        const token = generarToken(loggedUser);

        if (mongoose.connection.readyState === 1) {
            await LoginAudit.create({
                cedula_usuario: loggedUser.cedula,
                ip_conexion: req.ip || '127.0.0.1',
                estado_intento: 'Exitoso',
                tipo_evento: 'LOGIN_SUCCESS',
            }).catch(() => {});
        }

        res.json({
            ...loggedUser,
            token,
            permisos: permisosResult.recordset,
        });
    } catch (error) {
        console.error('[Identity/SQL Server] Login fallido:', error.message);
        res.status(500).json({ message: 'No se pudo iniciar sesión.' });
    }
});

// 3.5 Registrar / Crear nuevo usuario (con contraseña hasheada mediante bcrypt)
app.post('/api/auth/register', async (req, res) => {
    const { cedula, nombre_rol = 'Usuario', nombre, apellido, correo, contraseña, estado = 'Activo' } = req.body;

    if (!cedula || !nombre_rol || !nombre || !apellido || !correo || !contraseña) {
        return res.status(400).json({ message: 'Completa todos los campos obligatorios.' });
    }

    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');

        const hashedPassword = await bcrypt.hash(String(contraseña), 10);

        await pool.request()
            .input('cedula', sql.VarChar(20), cedula)
            .input('nombre_rol', sql.VarChar(50), nombre_rol)
            .input('nombre', sql.VarChar(50), nombre)
            .input('apellido', sql.VarChar(50), apellido)
            .input('correo', sql.VarChar(100), correo)
            .input('contraseña', sql.VarChar(255), hashedPassword)
            .input('estado', sql.VarChar(20), estado)
            .query(`
                INSERT INTO usuario (cedula, nombre_rol, nombre, apellido, correo, [contraseña], estado)
                VALUES (@cedula, @nombre_rol, @nombre, @apellido, @correo, @contraseña, @estado)
            `);

        // Acreditar automáticamente el Bono de Bienvenida de $20.000 COP en PostgreSQL para poder apostar de inmediato
        const bonoInicial = nombre_rol === 'Administrador' ? 0 : 20000;
        try {
            await pgPool.query(
                `
                INSERT INTO billetera (cedula_usuario, saldo_disponible)
                VALUES ($1, $2)
                ON CONFLICT (cedula_usuario) DO NOTHING
                `,
                [cedula, bonoInicial]
            );

            if (bonoInicial > 0) {
                await pgPool.query(
                    `
                    INSERT INTO tipo_transaccion (nombre_tipo, naturaleza_movimiento)
                    VALUES ('Bono Bienvenida', 'Ingreso')
                    ON CONFLICT (nombre_tipo) DO NOTHING
                    `
                );
                await pgPool.query(
                    `
                    INSERT INTO historial_billetera (cedula_usuario, nombre_tipo, monto, referencia_externa)
                    VALUES ($1, 'Bono Bienvenida', $2, $3)
                    `,
                    [cedula, bonoInicial, `BIENVENIDA-${cedula}`]
                );
            }
        } catch (pgErr) {
            console.error('[PostgreSQL] Aviso al crear billetera con bono de bienvenida:', pgErr.message);
        }

        res.status(201).json({
            message: 'Usuario registrado correctamente con Bono de Bienvenida de $20.000 COP.',
            bono_bienvenida: bonoInicial,
        });
    } catch (error) {
        console.error('[Identity/SQL Server] Registro fallido:', error.message);
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({ message: 'La cédula o el correo ya están registrados.' });
        }
        if (error.number === 547) {
            return res.status(400).json({ message: `El rol "${nombre_rol}" no existe en la tabla rol.` });
        }
        res.status(500).json({ message: 'No se pudo registrar el usuario.' });
    }
});

// 3.6 Actualizar usuario existente (Nombre, Apellido, Correo, Rol, Estado y Contraseña opcional hasheada)
app.put('/api/users/:cedula', async (req, res) => {
    const { cedula } = req.params;
    const { nombre, apellido, correo, nombre_rol, estado, contraseña } = req.body;

    if (!nombre || !apellido || !correo || !nombre_rol || !estado) {
        return res.status(400).json({ message: 'Nombre, apellido, correo, rol y estado son obligatorios.' });
    }

    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');

        const request = pool.request()
            .input('cedula', sql.VarChar(20), cedula)
            .input('nombre', sql.VarChar(50), nombre)
            .input('apellido', sql.VarChar(50), apellido)
            .input('correo', sql.VarChar(100), correo)
            .input('nombre_rol', sql.VarChar(50), nombre_rol)
            .input('estado', sql.VarChar(20), estado);

        let query = `
            UPDATE usuario
            SET nombre = @nombre,
                apellido = @apellido,
                correo = @correo,
                nombre_rol = @nombre_rol,
                estado = @estado
        `;

        if (contraseña && contraseña.trim() !== '') {
            const hashedPassword = await bcrypt.hash(String(contraseña), 10);
            request.input('contraseña', sql.VarChar(255), hashedPassword);
            query += `, [contraseña] = @contraseña`;
        }

        query += ` WHERE cedula = @cedula`;

        const result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error('[Identity/SQL Server] Error al actualizar usuario:', error.message);
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({ message: 'El correo electrónico ya está en uso por otro usuario.' });
        }
        res.status(500).json({ message: 'No se pudo actualizar el usuario.' });
    }
});

// 3.7 Eliminar usuario por cédula
app.delete('/api/users/:cedula', async (req, res) => {
    const { cedula } = req.params;

    try {
        const pool = await sqlServerPool;
        if (!pool) throw new Error('SQL Server no disponible');

        const result = await pool.request()
            .input('cedula', sql.VarChar(20), cedula)
            .query('DELETE FROM usuario WHERE cedula = @cedula');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('[Identity/SQL Server] Error al eliminar usuario:', error.message);
        res.status(500).json({ message: 'No se pudo eliminar el usuario.' });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`ApuestaX Backend en ejecución: http://localhost:${PORT}`);
    console.log(`   - Identidad (Auth): SQL Server`);
    console.log(`   - Deportes y Partidos: MySQL (/api/sports)`);
    console.log(`   - Billetera y Apuestas: PostgreSQL (/api/betting)`);
    console.log(`   - Reglas y Logs: MongoDB (/api/rules)`);
    console.log(`   - Diagnóstico: http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
});