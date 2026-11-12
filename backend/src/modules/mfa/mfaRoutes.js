const express = require('express');
const bcrypt = require('bcryptjs');
const {
    autenticar,
    generarToken,
    generarTokenMfa,
    verificarTokenMfa,
} = require('../../middlewares/authMiddleware');
const {
    generarConfiguracionMfa,
    validarCodigoMfa,
} = require('./mfaService');
const {
    cifrarSecreto,
    descifrarSecreto,
} = require('./mfaCrypto');

const router = express.Router();
const attempts = new Map();

function mfaEnabled() {
    return String(process.env.MFA_ENABLED).toLowerCase() === 'true';
}

function requireMfaEnabled(res) {
    if (!mfaEnabled()) {
        res.status(404).json({ message: 'MFA no está habilitado.' });
        return false;
    }
    return true;
}

function validateCode(codigo) {
    return /^\d{6}$/.test(String(codigo || '').trim());
}

function checkAttempts(token) {
    const now = Date.now();
    const current = attempts.get(token);
    if (!current || now - current.startedAt > 5 * 60 * 1000) {
        attempts.set(token, { startedAt: now, count: 1 });
        return true;
    }
    if (current.count >= 5) return false;
    current.count += 1;
    return true;
}

function clearAttempts(token) {
    attempts.delete(token);
}

function errorResponse(res, error, fallback = 'No se pudo procesar MFA.') {
    if (
        error.message.includes('MFA_ENCRYPTION_KEY') ||
        error.message.includes('MFA_JWT_SECRET')
    ) {
        return res.status(503).json({ message: error.message });
    }
    console.error('[MFA] Error:', error.message);
    return res.status(500).json({ message: fallback });
}

function createMfaRoutes({ sqlServerPool, sql, LoginAudit }) {
    router.post('/setup', autenticar, async (req, res) => {
        if (!requireMfaEnabled(res)) return;

        try {
            const pool = await sqlServerPool;
            const result = await pool.request()
                .input('cedula', sql.VarChar(20), req.user.cedula)
                .query(`
                    SELECT cedula, correo
                    FROM dbo.usuario
                    WHERE cedula = @cedula AND estado = 'Activo'
                `);
            const user = result.recordset[0];
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            const configuration = await generarConfiguracionMfa(user.correo);
            const encryptedSecret = cifrarSecreto(configuration.secret);

            await pool.request()
                .input('cedula', sql.VarChar(20), user.cedula)
                .input('secret', sql.NVarChar(1000), encryptedSecret)
                .query(`
                    UPDATE dbo.usuario
                    SET mfa_secreto_encriptado = @secret,
                        mfa_configuracion_pendiente = 1,
                        mfa_habilitado = 0,
                        mfa_fecha_activacion = NULL
                    WHERE cedula = @cedula
                `);

            await LoginAudit.create({
                cedula_usuario: user.cedula,
                ip_conexion: req.ip || '127.0.0.1',
                estado_intento: 'Exitoso',
                tipo_evento: 'MFA_SETUP_STARTED',
            }).catch((auditError) => {
                console.error('[MongoDB] Error registrando MFA_SETUP_STARTED:', auditError.message);
            });

            return res.json({
                qrCode: configuration.qrCode,
                manualKey: configuration.secret,
            });
        } catch (error) {
            return errorResponse(res, error, 'No se pudo iniciar la configuración MFA.');
        }
    });

    router.post('/enable', autenticar, async (req, res) => {
        if (!requireMfaEnabled(res)) return;
        const codigo = String(req.body?.codigo || '').trim();
        if (!validateCode(codigo)) {
            return res.status(400).json({ message: 'El código MFA debe tener seis dígitos.' });
        }

        try {
            const pool = await sqlServerPool;
            const result = await pool.request()
                .input('cedula', sql.VarChar(20), req.user.cedula)
                .query(`
                    SELECT mfa_secreto_encriptado, mfa_configuracion_pendiente
                    FROM dbo.usuario
                    WHERE cedula = @cedula AND estado = 'Activo'
                `);
            const user = result.recordset[0];
            if (!user?.mfa_configuracion_pendiente || !user.mfa_secreto_encriptado) {
                return res.status(409).json({ message: 'No existe una configuración MFA pendiente.' });
            }

            const secret = descifrarSecreto(user.mfa_secreto_encriptado);
            if (!validarCodigoMfa(codigo, secret)) {
                return res.status(401).json({ message: 'El código MFA no es válido.' });
            }

            await pool.request()
                .input('cedula', sql.VarChar(20), req.user.cedula)
                .query(`
                    UPDATE dbo.usuario
                    SET mfa_habilitado = 1,
                        mfa_configuracion_pendiente = 0,
                        mfa_fecha_activacion = SYSUTCDATETIME()
                    WHERE cedula = @cedula
                `);

            await LoginAudit.create({
                cedula_usuario: req.user.cedula,
                ip_conexion: req.ip || '127.0.0.1',
                estado_intento: 'Exitoso',
                tipo_evento: 'MFA_ENABLED',
            }).catch((auditError) => {
                console.error('[MongoDB] Error registrando MFA_ENABLED:', auditError.message);
            });

            return res.json({ message: 'MFA habilitado correctamente.' });
        } catch (error) {
            return errorResponse(res, error, 'No se pudo habilitar MFA.');
        }
    });

    router.post('/disable', autenticar, async (req, res) => {
        if (!requireMfaEnabled(res)) return;
        const { contraseña, codigo } = req.body || {};
        const normalizedCode = String(codigo || '').trim();
        if (!contraseña || !validateCode(normalizedCode)) {
            return res.status(400).json({
                message: 'La contraseña actual y el código MFA de seis dígitos son obligatorios.',
            });
        }

        try {
            const pool = await sqlServerPool;
            const result = await pool.request()
                .input('cedula', sql.VarChar(20), req.user.cedula)
                .query(`
                    SELECT [contraseña], mfa_habilitado, mfa_secreto_encriptado
                    FROM dbo.usuario
                    WHERE cedula = @cedula AND estado = 'Activo'
                `);
            const user = result.recordset[0];
            if (!user?.mfa_habilitado || !user.mfa_secreto_encriptado) {
                return res.status(409).json({ message: 'MFA no está habilitado.' });
            }

            const passwordValid = await bcrypt.compare(
                String(contraseña),
                String(user.contraseña || '')
            );
            if (!passwordValid) {
                return res.status(401).json({ message: 'La contraseña actual no es válida.' });
            }

            const secret = descifrarSecreto(user.mfa_secreto_encriptado);
            if (!validarCodigoMfa(normalizedCode, secret)) {
                return res.status(401).json({ message: 'El código MFA no es válido.' });
            }

            await pool.request()
                .input('cedula', sql.VarChar(20), req.user.cedula)
                .query(`
                    UPDATE dbo.usuario
                    SET mfa_habilitado = 0,
                        mfa_configuracion_pendiente = 0,
                        mfa_secreto_encriptado = NULL,
                        mfa_fecha_activacion = NULL
                    WHERE cedula = @cedula
                `);

            await LoginAudit.create({
                cedula_usuario: req.user.cedula,
                ip_conexion: req.ip || '127.0.0.1',
                estado_intento: 'Exitoso',
                tipo_evento: 'MFA_DISABLED',
            }).catch((auditError) => {
                console.error('[MongoDB] Error registrando MFA_DISABLED:', auditError.message);
            });

            return res.json({ message: 'MFA deshabilitado correctamente.' });
        } catch (error) {
            return errorResponse(res, error, 'No se pudo deshabilitar MFA.');
        }
    });

    router.get('/status', autenticar, async (req, res) => {
        if (!requireMfaEnabled(res)) return;

        try {
            const pool = await sqlServerPool;
            const result = await pool.request()
                .input('cedula', sql.VarChar(20), req.user.cedula)
                .query(`
                    SELECT mfa_habilitado,
                           mfa_configuracion_pendiente,
                           mfa_fecha_activacion
                    FROM dbo.usuario
                    WHERE cedula = @cedula AND estado = 'Activo'
                `);
            const status = result.recordset[0];
            if (!status) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            return res.json(status);
        } catch (error) {
            return errorResponse(res, error, 'No se pudo consultar el estado MFA.');
        }
    });

    router.post('/verify', async (req, res) => {
        if (!requireMfaEnabled(res)) return;
        const { mfaToken, codigo } = req.body || {};
        const normalizedCode = String(codigo || '').trim();

        if (!mfaToken || !validateCode(normalizedCode)) {
            return res.status(400).json({ message: 'El token MFA y el código de seis dígitos son obligatorios.' });
        }
        if (!checkAttempts(mfaToken)) {
            return res.status(429).json({ message: 'Demasiados intentos MFA. Solicita un nuevo inicio de sesión.' });
        }

        try {
            const mfaPayload = verificarTokenMfa(mfaToken);
            const pool = await sqlServerPool;
            const result = await pool.request()
                .input('cedula', sql.VarChar(20), mfaPayload.cedula)
                .query(`
                    SELECT cedula, nombre_rol, nombre, apellido, correo, estado,
                           mfa_habilitado, mfa_secreto_encriptado
                    FROM dbo.usuario
                    WHERE cedula = @cedula AND estado = 'Activo'
                `);
            const dbUser = result.recordset[0];
            if (!dbUser?.mfa_habilitado || !dbUser.mfa_secreto_encriptado) {
                return res.status(401).json({ message: 'MFA no está habilitado para este usuario.' });
            }

            const secret = descifrarSecreto(dbUser.mfa_secreto_encriptado);
            if (!validarCodigoMfa(normalizedCode, secret)) {
                await LoginAudit.create({
                    cedula_usuario: mfaPayload.cedula,
                    ip_conexion: req.ip || '127.0.0.1',
                    estado_intento: 'Fallido',
                    tipo_evento: 'MFA_LOGIN_FAILED',
                }).catch((auditError) => {
                    console.error('[MongoDB] Error registrando MFA_LOGIN_FAILED:', auditError.message);
                });
                return res.status(401).json({ message: 'El código MFA no es válido.' });
            }

            const loggedUser = {
                cedula: dbUser.cedula,
                nombre_rol: dbUser.nombre_rol,
                nombre: dbUser.nombre,
                apellido: dbUser.apellido,
                correo: dbUser.correo,
                estado: dbUser.estado,
            };
            const permisosResult = await pool.request()
                .input('nombre_rol', sql.VarChar(50), loggedUser.nombre_rol)
                .query(`
                    SELECT pr.nombre_modulo, ms.ruta_frontend
                    FROM permiso_rol pr
                    INNER JOIN modulo_sistema ms ON pr.nombre_modulo = ms.nombre_modulo
                    WHERE pr.nombre_rol = @nombre_rol
                `);

            clearAttempts(mfaToken);
            await LoginAudit.create({
                cedula_usuario: loggedUser.cedula,
                ip_conexion: req.ip || '127.0.0.1',
                estado_intento: 'Exitoso',
                tipo_evento: 'MFA_LOGIN_SUCCESS',
            }).catch((auditError) => {
                console.error('[MongoDB] Error registrando MFA_VERIFY_SUCCESS:', auditError.message);
            });

            return res.json({
                ...loggedUser,
                token: generarToken(loggedUser),
                permisos: permisosResult.recordset,
            });
        } catch (error) {
            if (
                error.message.includes('token MFA') ||
                error.message.includes('Firma del token') ||
                error.message.includes('Propósito del token')
            ) {
                return res.status(401).json({ message: error.message });
            }
            return errorResponse(res, error, 'No se pudo verificar MFA.');
        }
    });

    return router;
}

module.exports = createMfaRoutes;
