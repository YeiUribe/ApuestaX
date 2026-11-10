const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

require('dotenv').config();


// =====================================================================
// CONEXIONES DE BASES DE DATOS
// =====================================================================

const {
    poolPromise: sqlServerPool,
    sql,
} = require('./config/sqlServer');

const mysqlPool = require('./config/mysql');
const pgPool = require('./config/postgres');
const mongoose = require('./config/mongo');
const { authFirebase } = require('./config/firebase');


// =====================================================================
// MÓDULOS Y MIDDLEWARES
// =====================================================================

const sportsRoutes = require('./modules/sports/sportsRoutes');
const bettingRoutes = require('./modules/betting/bettingRoutes');
const rulesRoutes = require('./modules/rules/rulesRoutes');
const paymentRoutes = require('./modules/payments/paymentRoutes');

const {
    generarToken,
} = require('./middlewares/authMiddleware');

const {
    Regla,
    MercadoApuesta,
    LoginAudit,
    defaultMercados,
    defaultReglas,
} = require('./modules/rules/mongoSchemas');


// =====================================================================
// CONFIGURACIÓN DE EXPRESS
// =====================================================================

const app = express();

app.set('trust proxy', 1);


// =====================================================================
// CONFIGURACIÓN DE CORS
// =====================================================================

const allowedOrigins = (
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            /*
             * Peticiones como Postman, PowerShell, Azure Health Check
             * y aplicaciones servidor a servidor pueden no traer Origin.
             */
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn(
                `[CORS] Origen rechazado: ${origin}`
            );

            return callback(
                new Error(
                    `Origen no permitido por CORS: ${origin}`
                )
            );
        },
        credentials: true,
        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS',
        ],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
        ],
    })
);

app.use(express.json({
    limit: '1mb',
}));

app.use(express.urlencoded({
    extended: true,
    limit: '1mb',
}));


// =====================================================================
// RUTA PRINCIPAL
// =====================================================================

app.get('/', (req, res) => {
    return res.json({
        application: 'ApuestaX Backend',
        status: 'Online',
        environment:
            process.env.NODE_ENV || 'development',
        healthcheck: '/api/health',
        timestamp: new Date().toISOString(),
    });
});


// =====================================================================
// 1. HEALTHCHECK DIAGNÓSTICO
// =====================================================================

app.get('/api/health', async (req, res) => {
    const health = {
        server: 'Online',
        environment:
            process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),

        databases: {
            sqlServer: 'Desconectado',
            mySQL: 'Desconectado',
            postgreSQL: 'Desconectado',

            mongoDB:
                mongoose.connection.readyState === 1
                    ? 'Conectado'
                    : 'Desconectado',

            firebase:
                dbFirebase
                    ? `Configurado (${process.env.FIREBASE_PROJECT_ID ||
                    'apuestax-pagos'
                    })`
                    : 'Desconectado',
        },
    };


    // -----------------------------------------------------------------
    // SQL Server
    // -----------------------------------------------------------------

    try {
        const pool = await sqlServerPool;

        if (pool) {
            await pool
                .request()
                .query('SELECT 1 AS ok');

            health.databases.sqlServer =
                'Conectado';
        }
    } catch (error) {
        health.databases.sqlServer =
            'Error de conexión';

        console.error(
            '[Health] SQL Server:',
            error.message
        );
    }


    // -----------------------------------------------------------------
    // MySQL
    // -----------------------------------------------------------------

    try {
        if (mysqlPool) {
            await mysqlPool.query(
                'SELECT 1 AS ok'
            );

            health.databases.mySQL =
                'Conectado';
        }
    } catch (error) {
        health.databases.mySQL =
            'Error de conexión';

        console.error(
            '[Health] MySQL:',
            error.message
        );
    }


    // -----------------------------------------------------------------
    // PostgreSQL
    // -----------------------------------------------------------------

    try {
        if (pgPool) {
            await pgPool.query(
                'SELECT 1 AS ok'
            );

            health.databases.postgreSQL =
                'Conectado';
        }
    } catch (error) {
        health.databases.postgreSQL =
            'Error de conexión';

        console.error(
            '[Health] PostgreSQL:',
            error.message
        );
    }


    const databaseStatuses =
        Object.values(health.databases);

    const hasDatabaseError =
        databaseStatuses.some(
            (status) =>
                status === 'Error de conexión'
        );

    health.status = hasDatabaseError
        ? 'Degradado'
        : 'Operativo';

    return res.status(
        hasDatabaseError ? 503 : 200
    ).json(health);
});


// =====================================================================
// 2. RUTAS MODULARES
// =====================================================================

app.use(
    '/api/sports',
    sportsRoutes
);

app.use(
    '/api/betting',
    bettingRoutes
);

app.use(
    '/api/rules',
    rulesRoutes
);

app.use(
    '/api/payments',
    paymentRoutes
);


// =====================================================================
// 2.1 DASHBOARD MULTIBASE
// GET /api/dashboard/:cedula
// =====================================================================

app.get('/api/dashboard/:cedula', async (req, res) => {
    const { cedula } = req.params;

    if (!cedula?.trim()) {
        return res.status(400).json({
            message:
                'La cédula es obligatoria.',
        });
    }


    /*
     * Los valores iniciales deben ser seguros.
     * Si PostgreSQL no responde, no se debe inventar saldo.
     */
    const responseData = {
        usuario: null,

        saldo: {
            cedula_usuario: cedula,
            saldo_disponible: 0,
            ultima_actualizacion: null,
        },

        apuestasRecientes: [],
        proximosPartidos: [],
        mercados: defaultMercados,
        reglas: defaultReglas,
    };


    // -----------------------------------------------------------------
    // SQL Server: usuario
    // -----------------------------------------------------------------

    try {
        const pool = await sqlServerPool;

        if (pool) {
            const userResult = await pool
                .request()

                .input(
                    'cedula',
                    sql.VarChar(20),
                    cedula
                )

                .query(`
                    SELECT
                        cedula,
                        nombre_rol,
                        nombre,
                        apellido,
                        correo,
                        estado
                    FROM usuario
                    WHERE cedula = @cedula
                `);

            if (
                userResult.recordset.length > 0
            ) {
                responseData.usuario =
                    userResult.recordset[0];
            }
        }
    } catch (error) {
        console.error(
            '[Dashboard] Error SQL Server:',
            error.message
        );
    }


    // -----------------------------------------------------------------
    // MySQL: próximos partidos
    // -----------------------------------------------------------------

    try {
        if (mysqlPool) {
            const [matches] =
                await mysqlPool.query(`
                    SELECT
                        codigo_partido,
                        codigo_jornada,
                        equipo_local,
                        equipo_visitante,
                        fecha_hora,
                        marcador_local,
                        marcador_visitante,
                        estado_partido
                    FROM partido
                    ORDER BY fecha_hora ASC
                    LIMIT 5
                `);

            responseData.proximosPartidos =
                matches;
        }
    } catch (error) {
        console.error(
            '[Dashboard] Error MySQL:',
            error.message
        );
    }


    // -----------------------------------------------------------------
    // PostgreSQL: billetera y apuestas
    // -----------------------------------------------------------------

    try {
        if (pgPool) {
            const walletResult =
                await pgPool.query(
                    `
                    SELECT
                        cedula_usuario,
                        saldo_disponible,
                        ultima_actualizacion
                    FROM billetera
                    WHERE cedula_usuario = $1
                    `,
                    [cedula]
                );

            if (
                walletResult.rows.length > 0
            ) {
                responseData.saldo =
                    walletResult.rows[0];
            }


            const ticketsResult =
                await pgPool.query(
                    `
                    SELECT
                        codigo_ticket,
                        cedula_usuario,
                        origen_fondos,
                        monto_total,
                        posible_ganancia_total,
                        estado_ticket,
                        fecha_emision
                    FROM ticket_apuesta
                    WHERE cedula_usuario = $1
                    ORDER BY fecha_emision DESC
                    LIMIT 5
                    `,
                    [cedula]
                );

            responseData.apuestasRecientes =
                ticketsResult.rows;
        }
    } catch (error) {
        console.error(
            '[Dashboard] Error PostgreSQL:',
            error.message
        );
    }


    // -----------------------------------------------------------------
    // MongoDB: mercados y reglas
    // -----------------------------------------------------------------

    try {
        if (
            mongoose.connection.readyState === 1
        ) {
            const [
                mercados,
                reglas,
            ] = await Promise.all([
                MercadoApuesta.find({
                    activo: true,
                }),

                Regla.find(),
            ]);

            if (mercados.length > 0) {
                responseData.mercados =
                    mercados;
            }

            if (reglas.length > 0) {
                responseData.reglas =
                    reglas;
            }
        }
    } catch (error) {
        console.error(
            '[Dashboard] Error MongoDB:',
            error.message
        );
    }


    return res.json(responseData);
});


// =====================================================================
// 3. IDENTIDAD, ROLES, PERMISOS Y USUARIOS
// =====================================================================


// =====================================================================
// 3.1 OBTENER USUARIOS
// GET /api/users
// =====================================================================

app.get('/api/users', async (req, res) => {
    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }

        const result =
            await pool.request().query(`
                SELECT
                    u.cedula,
                    u.nombre_rol,
                    r.descripcion
                        AS descripcion_rol,
                    u.nombre,
                    u.apellido,
                    u.correo,
                    u.estado
                FROM usuario u
                LEFT JOIN rol r
                    ON u.nombre_rol =
                       r.nombre_rol
                ORDER BY
                    u.nombre,
                    u.apellido
            `);

        const users =
            result.recordset.map(
                (user) => ({
                    ...user,

                    name:
                        `${user.nombre} ${user.apellido}`,

                    email:
                        user.correo,

                    role:
                        user.nombre_rol,
                })
            );

        return res.json(users);

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Error al obtener usuarios:',
            error.message
        );

        return res.status(500).json({
            message:
                'Error al obtener los usuarios.',
        });
    }
});


// =====================================================================
// 3.2 OBTENER ROLES Y PERMISOS
// GET /api/roles
// =====================================================================

app.get('/api/roles', async (req, res) => {
    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }

        const rolesResult =
            await pool.request().query(`
                SELECT
                    nombre_rol,
                    descripcion
                FROM rol
                ORDER BY nombre_rol
            `);


        const permisosResult =
            await pool.request().query(`
                SELECT
                    pr.nombre_rol,
                    pr.nombre_modulo,
                    ms.ruta_frontend
                FROM permiso_rol pr
                INNER JOIN modulo_sistema ms
                    ON pr.nombre_modulo =
                       ms.nombre_modulo
                ORDER BY
                    pr.nombre_rol,
                    pr.nombre_modulo
            `);


        const permisosPorRol = {};

        permisosResult.recordset.forEach(
            (permiso) => {
                if (
                    !permisosPorRol[
                    permiso.nombre_rol
                    ]
                ) {
                    permisosPorRol[
                        permiso.nombre_rol
                    ] = [];
                }

                permisosPorRol[
                    permiso.nombre_rol
                ].push({
                    nombre_modulo:
                        permiso.nombre_modulo,

                    ruta_frontend:
                        permiso.ruta_frontend,
                });
            }
        );


        const roles =
            rolesResult.recordset.map(
                (rol) => ({
                    ...rol,

                    permisos:
                        permisosPorRol[
                        rol.nombre_rol
                        ] || [],
                })
            );

        return res.json(roles);

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Error al obtener roles:',
            error.message
        );

        return res.status(500).json({
            message:
                'Error al obtener roles y permisos.',
        });
    }
});


// =====================================================================
// 3.3 OBTENER EMPRESAS
// GET /api/empresas
// =====================================================================

app.get('/api/empresas', async (req, res) => {
    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }

        const result =
            await pool.request().query(`
                SELECT
                    nit,
                    nombre,
                    correo,
                    telefono,
                    direccion
                FROM empresa
                ORDER BY nombre
            `);

        return res.json(
            result.recordset
        );

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Error al obtener empresas:',
            error.message
        );

        return res.status(500).json({
            message:
                'Error al obtener empresas.',
        });
    }
});


// =====================================================================
// MIGRACIÓN DE CONTRASEÑAS PLANAS A BCRYPT
// =====================================================================

async function hashExistingPlainPasswords() {
    try {
        const pool = await sqlServerPool;

        if (!pool) {
            return;
        }

        const usersResult =
            await pool.request().query(`
                SELECT
                    cedula,
                    [contraseña]
                FROM usuario
            `);

        for (
            const row of
            usersResult.recordset
        ) {
            const rawPassword =
                String(
                    row.contraseña || ''
                );

            const isBcrypt =
                rawPassword.startsWith('$2a$') ||
                rawPassword.startsWith('$2b$');

            if (
                rawPassword &&
                !isBcrypt
            ) {
                const hashedPassword =
                    await bcrypt.hash(
                        rawPassword,
                        10
                    );

                await pool
                    .request()

                    .input(
                        'cedula',
                        sql.VarChar(20),
                        row.cedula
                    )

                    .input(
                        'hash',
                        sql.VarChar(255),
                        hashedPassword
                    )

                    .query(`
                        UPDATE usuario
                        SET [contraseña] = @hash
                        WHERE cedula = @cedula
                    `);
            }
        }

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Error al verificar contraseñas:',
            error.message
        );
    }
}

hashExistingPlainPasswords();


// =====================================================================
// 3.4 INICIAR SESIÓN
// POST /api/auth/login
// =====================================================================

app.post('/api/auth/login', async (req, res) => {
    const {
        correo,
        contraseña,
    } = req.body;

    if (
        !correo ||
        !contraseña
    ) {
        return res.status(400).json({
            message:
                'Correo y contraseña son obligatorios.',
        });
    }


    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }


        const result = await pool
            .request()

            .input(
                'correo',
                sql.VarChar(100),
                correo
            )

            .query(`
                SELECT
                    cedula,
                    nombre_rol,
                    nombre,
                    apellido,
                    correo,
                    [contraseña],
                    estado
                FROM usuario
                WHERE correo = @correo
                  AND estado = 'Activo'
            `);


        let passwordValid = false;
        let dbUser = null;


        if (
            result.recordset.length > 0
        ) {
            dbUser =
                result.recordset[0];

            const storedPassword =
                String(
                    dbUser.contraseña || ''
                );

            const isBcryptHash =
                storedPassword.startsWith('$2a$') ||
                storedPassword.startsWith('$2b$');


            if (isBcryptHash) {
                passwordValid =
                    await bcrypt.compare(
                        String(contraseña),
                        storedPassword
                    );

            } else if (
                storedPassword ===
                String(contraseña)
            ) {
                passwordValid = true;

                const newHash =
                    await bcrypt.hash(
                        String(contraseña),
                        10
                    );

                await pool
                    .request()

                    .input(
                        'cedula',
                        sql.VarChar(20),
                        dbUser.cedula
                    )

                    .input(
                        'hash',
                        sql.VarChar(255),
                        newHash
                    )

                    .query(`
                        UPDATE usuario
                        SET [contraseña] = @hash
                        WHERE cedula = @cedula
                    `);
            }
        }


        if (
            !dbUser ||
            !passwordValid
        ) {
            if (
                mongoose.connection
                    .readyState === 1
            ) {
                await LoginAudit.create({
                    cedula_usuario: correo,

                    ip_conexion:
                        req.ip ||
                        '127.0.0.1',

                    estado_intento:
                        'Fallido',

                    tipo_evento:
                        'LOGIN_FAILED',
                }).catch((auditError) => {
                    console.error(
                        '[MongoDB] Error registrando LOGIN_FAILED:',
                        auditError.message
                    );
                });
            }

            return res.status(401).json({
                message: !dbUser
                    ? 'El correo ingresado no se encuentra registrado o la cuenta está inactiva.'
                    : 'Contraseña incorrecta. Verifica tus datos e intenta nuevamente.',
            });
        }


        const loggedUser = {
            cedula:
                dbUser.cedula,

            nombre_rol:
                dbUser.nombre_rol,

            nombre:
                dbUser.nombre,

            apellido:
                dbUser.apellido,

            correo:
                dbUser.correo,

            estado:
                dbUser.estado,
        };


        const permisosResult =
            await pool
                .request()

                .input(
                    'nombre_rol',
                    sql.VarChar(50),
                    loggedUser.nombre_rol
                )

                .query(`
                    SELECT
                        pr.nombre_modulo,
                        ms.ruta_frontend
                    FROM permiso_rol pr
                    INNER JOIN modulo_sistema ms
                        ON pr.nombre_modulo =
                           ms.nombre_modulo
                    WHERE pr.nombre_rol =
                          @nombre_rol
                `);


        const token =
            generarToken(loggedUser);


        if (
            mongoose.connection.readyState === 1
        ) {
            await LoginAudit.create({
                cedula_usuario:
                    loggedUser.cedula,

                ip_conexion:
                    req.ip ||
                    '127.0.0.1',

                estado_intento:
                    'Exitoso',

                tipo_evento:
                    'LOGIN_SUCCESS',
            }).catch((auditError) => {
                console.error(
                    '[MongoDB] Error registrando LOGIN_SUCCESS:',
                    auditError.message
                );
            });
        }


        return res.json({
            ...loggedUser,
            token,
            permisos:
                permisosResult.recordset,
        });

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Login fallido:',
            error.message
        );

        return res.status(500).json({
            message:
                'No se pudo iniciar sesión.',
        });
    }
});

// =====================================================================
// 3.4.1 INICIAR SESIÓN CON GOOGLE
// POST /api/auth/google
// =====================================================================

app.post('/api/auth/google', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({
            message:
                'El token de autenticación de Google es obligatorio.'
        });
    }

    try {
        // -------------------------------------------------------------
        // 1. Verificar token con Firebase Admin
        // -------------------------------------------------------------

        const decodedToken =
            await authFirebase.verifyIdToken(idToken);

        const correo =
            decodedToken.email?.trim().toLowerCase();

        if (!correo) {
            return res.status(401).json({
                message:
                    'La cuenta de Google no proporcionó un correo válido.'
            });
        }

        if (!decodedToken.email_verified) {
            return res.status(401).json({
                message:
                    'El correo de Google no se encuentra verificado.'
            });
        }

        // -------------------------------------------------------------
        // 2. Buscar el usuario real de ApuestaX en Azure SQL
        // -------------------------------------------------------------

        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }

        const result = await pool
            .request()
            .input(
                'correo',
                sql.VarChar(100),
                correo
            )
            .query(`
                SELECT
                    cedula,
                    nombre_rol,
                    nombre,
                    apellido,
                    correo,
                    estado
                FROM usuario
                WHERE LOWER(correo) = LOWER(@correo)
                  AND estado = 'Activo'
            `);

        if (result.recordset.length === 0) {
            return res.status(403).json({
                message:
                    'La cuenta de Google no está vinculada a un usuario activo de ApuestaX.'
            });
        }

        const dbUser = result.recordset[0];

        const loggedUser = {
            cedula: dbUser.cedula,
            nombre_rol: dbUser.nombre_rol,
            nombre: dbUser.nombre,
            apellido: dbUser.apellido,
            correo: dbUser.correo,
            estado: dbUser.estado
        };

        // -------------------------------------------------------------
        // 3. Obtener permisos desde Azure SQL
        // -------------------------------------------------------------

        const permisosResult = await pool
            .request()
            .input(
                'nombre_rol',
                sql.VarChar(50),
                loggedUser.nombre_rol
            )
            .query(`
                SELECT
                    pr.nombre_modulo,
                    ms.ruta_frontend
                FROM permiso_rol pr
                INNER JOIN modulo_sistema ms
                    ON pr.nombre_modulo = ms.nombre_modulo
                WHERE pr.nombre_rol = @nombre_rol
            `);

        // -------------------------------------------------------------
        // 4. Generar JWT normal de ApuestaX
        // -------------------------------------------------------------

        const token =
            generarToken(loggedUser);

        // -------------------------------------------------------------
        // 5. Registrar auditoría
        // -------------------------------------------------------------

        if (
            mongoose.connection.readyState === 1
        ) {
            await LoginAudit.create({
                cedula_usuario:
                    loggedUser.cedula,

                ip_conexion:
                    req.ip || '127.0.0.1',

                estado_intento:
                    'Exitoso',

                tipo_evento:
                    'LOGIN_GOOGLE_SUCCESS'
            }).catch((auditError) => {
                console.error(
                    '[MongoDB] Error registrando LOGIN_GOOGLE_SUCCESS:',
                    auditError.message
                );
            });
        }

        // -------------------------------------------------------------
        // 6. Responder igual que login tradicional
        // -------------------------------------------------------------

        return res.json({
            ...loggedUser,
            token,
            permisos:
                permisosResult.recordset,
            proveedor_autenticacion:
                'Google'
        });

    } catch (error) {
        console.error(
            '[Auth/Google] Error:',
            error.message
        );

        return res.status(401).json({
            message:
                'No se pudo validar la autenticación con Google.'
        });
    }
});

// =====================================================================
// 3.4.2 REGISTRAR USUARIO CON GOOGLE
// POST /api/auth/register-google
// =====================================================================

app.post('/api/auth/register-google', async (req, res) => {
    const {
        idToken,
        cedula,
        nombre,
        apellido
    } = req.body;

    if (!idToken) {
        return res.status(400).json({
            message:
                'El token de Google es obligatorio.'
        });
    }

    if (!cedula?.trim()) {
        return res.status(400).json({
            message:
                'El número de documento es obligatorio.'
        });
    }

    try {
        // ============================================================
        // 1. VERIFICAR IDENTIDAD CON FIREBASE
        // ============================================================

        const decodedToken =
            await authFirebase.verifyIdToken(idToken);

        const correo =
            decodedToken.email
                ?.trim()
                .toLowerCase();

        if (!correo) {
            return res.status(401).json({
                message:
                    'Google no proporcionó un correo válido.'
            });
        }

        if (!decodedToken.email_verified) {
            return res.status(401).json({
                message:
                    'El correo de Google no está verificado.'
            });
        }

        // ============================================================
        // 2. VALIDAR DATOS
        // ============================================================

        const nombreFinal =
            String(nombre || '')
                .trim();

        const apellidoFinal =
            String(apellido || '')
                .trim();

        if (!nombreFinal || !apellidoFinal) {
            return res.status(400).json({
                message:
                    'Nombre y apellido son obligatorios.'
            });
        }

        const pool =
            await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }

        // ============================================================
        // 3. COMPROBAR QUE NO EXISTA
        // ============================================================

        const existingUser =
            await pool
                .request()

                .input(
                    'cedula',
                    sql.VarChar(20),
                    cedula.trim()
                )

                .input(
                    'correo',
                    sql.VarChar(100),
                    correo
                )

                .query(`
                    SELECT
                        cedula,
                        correo
                    FROM usuario
                    WHERE cedula = @cedula
                       OR LOWER(correo) = LOWER(@correo)
                `);

        if (
            existingUser.recordset.length > 0
        ) {
            return res.status(409).json({
                message:
                    'Ya existe una cuenta de ApuestaX con este correo o número de documento.'
            });
        }

        // ============================================================
        // 4. CREAR EL USUARIO
        // ============================================================

        /*
         * IMPORTANTE:
         * El usuario registrado desde Google SIEMPRE
         * se crea con rol Usuario.
         *
         * Nunca aceptamos nombre_rol desde el navegador.
         */

        const nombreRol = 'Usuario';

        /*
         * La tabla actual exige contraseña.
         *
         * Creamos un valor aleatorio imposible de conocer desde
         * el cliente. El usuario utilizará Google para autenticarse.
         */

        const passwordAleatorio =
            require('crypto')
                .randomBytes(48)
                .toString('hex');

        const passwordHash =
            await bcrypt.hash(
                passwordAleatorio,
                10
            );

        await pool
            .request()

            .input(
                'cedula',
                sql.VarChar(20),
                cedula.trim()
            )

            .input(
                'nombre_rol',
                sql.VarChar(50),
                nombreRol
            )

            .input(
                'nombre',
                sql.VarChar(50),
                nombreFinal
            )

            .input(
                'apellido',
                sql.VarChar(50),
                apellidoFinal
            )

            .input(
                'correo',
                sql.VarChar(100),
                correo
            )

            .input(
                'contraseña',
                sql.VarChar(255),
                passwordHash
            )

            .input(
                'estado',
                sql.VarChar(20),
                'Activo'
            )

            .query(`
                INSERT INTO usuario (
                    cedula,
                    nombre_rol,
                    nombre,
                    apellido,
                    correo,
                    [contraseña],
                    estado
                )
                VALUES (
                    @cedula,
                    @nombre_rol,
                    @nombre,
                    @apellido,
                    @correo,
                    @contraseña,
                    @estado
                )
            `);

        // ============================================================
        // 5. CREAR BILLETERA
        // ============================================================

        const bonoInicial = 20000;

        try {
            await pgPool.query(
                `
                INSERT INTO billetera (
                    cedula_usuario,
                    saldo_disponible
                )
                VALUES ($1, $2)
                ON CONFLICT (
                    cedula_usuario
                )
                DO NOTHING
                `,
                [
                    cedula.trim(),
                    bonoInicial
                ]
            );

            await pgPool.query(`
                INSERT INTO tipo_transaccion (
                    nombre_tipo,
                    naturaleza_movimiento
                )
                VALUES (
                    'Bono Bienvenida',
                    'Ingreso'
                )
                ON CONFLICT (
                    nombre_tipo
                )
                DO NOTHING
            `);

            await pgPool.query(
                `
                INSERT INTO historial_billetera (
                    cedula_usuario,
                    nombre_tipo,
                    monto,
                    referencia_externa
                )
                VALUES (
                    $1,
                    'Bono Bienvenida',
                    $2,
                    $3
                )
                ON CONFLICT (
                    referencia_externa
                )
                WHERE referencia_externa
                      IS NOT NULL
                DO NOTHING
                `,
                [
                    cedula.trim(),
                    bonoInicial,
                    `BIENVENIDA-${cedula.trim()}`
                ]
            );

        } catch (pgError) {
            console.error(
                '[PostgreSQL] Error creando billetera Google:',
                pgError.message
            );
        }

        // ============================================================
        // 6. PREPARAR SESIÓN APUESTAX
        // ============================================================

        const loggedUser = {
            cedula:
                cedula.trim(),

            nombre_rol:
                nombreRol,

            nombre:
                nombreFinal,

            apellido:
                apellidoFinal,

            correo,

            estado:
                'Activo'
        };

        const permisosResult =
            await pool
                .request()

                .input(
                    'nombre_rol',
                    sql.VarChar(50),
                    nombreRol
                )

                .query(`
                    SELECT
                        pr.nombre_modulo,
                        ms.ruta_frontend
                    FROM permiso_rol pr
                    INNER JOIN modulo_sistema ms
                        ON pr.nombre_modulo =
                           ms.nombre_modulo
                    WHERE pr.nombre_rol =
                          @nombre_rol
                `);

        const token =
            generarToken(loggedUser);

        // ============================================================
        // 7. AUDITORÍA
        // ============================================================

        if (
            mongoose.connection.readyState === 1
        ) {
            await LoginAudit.create({
                cedula_usuario:
                    loggedUser.cedula,

                ip_conexion:
                    req.ip ||
                    '127.0.0.1',

                estado_intento:
                    'Exitoso',

                tipo_evento:
                    'REGISTER_GOOGLE_SUCCESS'

            }).catch((auditError) => {
                console.error(
                    '[MongoDB] Error registrando REGISTER_GOOGLE_SUCCESS:',
                    auditError.message
                );
            });
        }

        // ============================================================
        // 8. RESPUESTA
        // ============================================================

        return res
            .status(201)
            .json({
                ...loggedUser,

                token,

                permisos:
                    permisosResult.recordset,

                proveedor_autenticacion:
                    'Google',

                bono_bienvenida:
                    bonoInicial,

                message:
                    'Cuenta creada correctamente con Google.'
            });

    } catch (error) {
        console.error(
            '[Auth/Google/Register] Error:',
            error.message
        );

        if (
            error.number === 2627 ||
            error.number === 2601
        ) {
            return res.status(409).json({
                message:
                    'La cédula o el correo ya están registrados.'
            });
        }

        return res.status(500).json({
            message:
                'No se pudo crear la cuenta con Google.'
        });
    }
});


// =====================================================================
// 3.5 REGISTRAR USUARIO
// POST /api/auth/register
// =====================================================================

app.post('/api/auth/register', async (req, res) => {
    const {
        cedula,
        nombre_rol = 'Usuario',
        nombre,
        apellido,
        correo,
        contraseña,
        estado = 'Activo',
    } = req.body;


    if (
        !cedula ||
        !nombre_rol ||
        !nombre ||
        !apellido ||
        !correo ||
        !contraseña
    ) {
        return res.status(400).json({
            message:
                'Completa todos los campos obligatorios.',
        });
    }


    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }


        const hashedPassword =
            await bcrypt.hash(
                String(contraseña),
                10
            );


        await pool
            .request()

            .input(
                'cedula',
                sql.VarChar(20),
                cedula
            )

            .input(
                'nombre_rol',
                sql.VarChar(50),
                nombre_rol
            )

            .input(
                'nombre',
                sql.VarChar(50),
                nombre
            )

            .input(
                'apellido',
                sql.VarChar(50),
                apellido
            )

            .input(
                'correo',
                sql.VarChar(100),
                correo
            )

            .input(
                'contraseña',
                sql.VarChar(255),
                hashedPassword
            )

            .input(
                'estado',
                sql.VarChar(20),
                estado
            )

            .query(`
                INSERT INTO usuario (
                    cedula,
                    nombre_rol,
                    nombre,
                    apellido,
                    correo,
                    [contraseña],
                    estado
                )
                VALUES (
                    @cedula,
                    @nombre_rol,
                    @nombre,
                    @apellido,
                    @correo,
                    @contraseña,
                    @estado
                )
            `);


        /*
         * Se crea la billetera en PostgreSQL.
         * Los administradores no reciben bono.
         */
        const bonoInicial =
            nombre_rol === 'Administrador'
                ? 0
                : 20000;


        try {
            await pgPool.query(
                `
                INSERT INTO billetera (
                    cedula_usuario,
                    saldo_disponible
                )
                VALUES ($1, $2)
                ON CONFLICT (
                    cedula_usuario
                ) DO NOTHING
                `,
                [
                    cedula,
                    bonoInicial,
                ]
            );


            if (bonoInicial > 0) {
                await pgPool.query(`
                    INSERT INTO tipo_transaccion (
                        nombre_tipo,
                        naturaleza_movimiento
                    )
                    VALUES (
                        'Bono Bienvenida',
                        'Ingreso'
                    )
                    ON CONFLICT (
                        nombre_tipo
                    ) DO NOTHING
                `);


                await pgPool.query(
                    `
                    INSERT INTO historial_billetera (
                        cedula_usuario,
                        nombre_tipo,
                        monto,
                        referencia_externa
                    )
                    VALUES (
                        $1,
                        'Bono Bienvenida',
                        $2,
                        $3
                    )
                    ON CONFLICT (
                        referencia_externa
                    )
                    WHERE referencia_externa
                          IS NOT NULL
                    DO NOTHING
                    `,
                    [
                        cedula,
                        bonoInicial,
                        `BIENVENIDA-${cedula}`,
                    ]
                );
            }

        } catch (pgError) {
            console.error(
                '[PostgreSQL] No se pudo crear la billetera:',
                pgError.message
            );
        }


        return res.status(201).json({
            message:
                nombre_rol === 'Administrador'
                    ? 'Administrador registrado correctamente.'
                    : 'Usuario registrado con Bono de Bienvenida de $20.000 COP.',

            bono_bienvenida:
                bonoInicial,
        });

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Registro fallido:',
            error.message
        );


        if (
            error.number === 2627 ||
            error.number === 2601
        ) {
            return res.status(409).json({
                message:
                    'La cédula o el correo ya están registrados.',
            });
        }


        if (error.number === 547) {
            return res.status(400).json({
                message:
                    `El rol "${nombre_rol}" no existe.`,
            });
        }


        return res.status(500).json({
            message:
                'No se pudo registrar el usuario.',
        });
    }
});


// =====================================================================
// 3.6 ACTUALIZAR USUARIO
// PUT /api/users/:cedula
// =====================================================================

app.put('/api/users/:cedula', async (req, res) => {
    const { cedula } = req.params;

    const {
        nombre,
        apellido,
        correo,
        nombre_rol,
        estado,
        contraseña,
    } = req.body;


    if (
        !nombre ||
        !apellido ||
        !correo ||
        !nombre_rol ||
        !estado
    ) {
        return res.status(400).json({
            message:
                'Nombre, apellido, correo, rol y estado son obligatorios.',
        });
    }


    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }


        const request = pool
            .request()

            .input(
                'cedula',
                sql.VarChar(20),
                cedula
            )

            .input(
                'nombre',
                sql.VarChar(50),
                nombre
            )

            .input(
                'apellido',
                sql.VarChar(50),
                apellido
            )

            .input(
                'correo',
                sql.VarChar(100),
                correo
            )

            .input(
                'nombre_rol',
                sql.VarChar(50),
                nombre_rol
            )

            .input(
                'estado',
                sql.VarChar(20),
                estado
            );


        let query = `
            UPDATE usuario
            SET
                nombre = @nombre,
                apellido = @apellido,
                correo = @correo,
                nombre_rol = @nombre_rol,
                estado = @estado
        `;


        if (
            contraseña &&
            contraseña.trim() !== ''
        ) {
            const hashedPassword =
                await bcrypt.hash(
                    String(contraseña),
                    10
                );

            request.input(
                'contraseña',
                sql.VarChar(255),
                hashedPassword
            );

            query +=
                ', [contraseña] = @contraseña';
        }


        query +=
            ' WHERE cedula = @cedula';


        const result =
            await request.query(query);


        if (
            result.rowsAffected[0] === 0
        ) {
            return res.status(404).json({
                message:
                    'Usuario no encontrado.',
            });
        }


        return res.json({
            message:
                'Usuario actualizado correctamente.',
        });

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Error al actualizar usuario:',
            error.message
        );


        if (
            error.number === 2627 ||
            error.number === 2601
        ) {
            return res.status(409).json({
                message:
                    'El correo ya está en uso por otro usuario.',
            });
        }


        return res.status(500).json({
            message:
                'No se pudo actualizar el usuario.',
        });
    }
});


// =====================================================================
// 3.7 ELIMINAR USUARIO
// DELETE /api/users/:cedula
// =====================================================================

app.delete('/api/users/:cedula', async (req, res) => {
    const { cedula } = req.params;

    try {
        const pool = await sqlServerPool;

        if (!pool) {
            throw new Error(
                'SQL Server no disponible'
            );
        }


        const result = await pool
            .request()

            .input(
                'cedula',
                sql.VarChar(20),
                cedula
            )

            .query(`
                DELETE FROM usuario
                WHERE cedula = @cedula
            `);


        if (
            result.rowsAffected[0] === 0
        ) {
            return res.status(404).json({
                message:
                    'Usuario no encontrado.',
            });
        }


        return res.json({
            message:
                'Usuario eliminado correctamente.',
        });

    } catch (error) {
        console.error(
            '[Identity/SQL Server] Error al eliminar usuario:',
            error.message
        );

        return res.status(500).json({
            message:
                'No se pudo eliminar el usuario.',
        });
    }
});


// =====================================================================
// 4. RUTA NO ENCONTRADA
// =====================================================================

app.use((req, res) => {
    return res.status(404).json({
        message: 'Ruta no encontrada.',
        method: req.method,
        path: req.originalUrl,
    });
});


// =====================================================================
// 5. MANEJADOR GLOBAL DE ERRORES
// =====================================================================

app.use((error, req, res, next) => {
    console.error(
        '[Express] Error no controlado:',
        error.message
    );

    if (
        error.message?.startsWith(
            'Origen no permitido por CORS'
        )
    ) {
        return res.status(403).json({
            message:
                'El origen de la solicitud no está autorizado.',
        });
    }

    return res.status(500).json({
        message:
            'Ocurrió un error interno en el servidor.',
    });
});


// =====================================================================
// 6. INICIAR SERVIDOR
// =====================================================================

const PORT =
    Number(process.env.PORT || 5000);

const HOST = '0.0.0.0';


app.listen(PORT, HOST, () => {
    const environment =
        process.env.NODE_ENV ||
        'development';

    console.log(
        '\n======================================================'
    );

    console.log(
        'ApuestaX Backend en ejecución'
    );

    console.log(
        `Entorno: ${environment}`
    );

    console.log(
        `Host: ${HOST}`
    );

    console.log(
        `Puerto: ${PORT}`
    );

    console.log(
        'Identidad: SQL Server'
    );

    console.log(
        'Deportes y partidos: MySQL (/api/sports)'
    );

    console.log(
        'Billetera y apuestas: PostgreSQL (/api/betting)'
    );

    console.log(
        'Reglas y auditoría: MongoDB (/api/rules)'
    );

    console.log(
        'Pagos: Wompi + Firebase (/api/payments)'
    );

    console.log(
        'Diagnóstico: /api/health'
    );

    console.log(
        '======================================================\n'
    );
});