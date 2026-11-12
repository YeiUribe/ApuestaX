const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'apuestax_super_secret_jwt_key_2026';
const MFA_JWT_SECRET = process.env.MFA_JWT_SECRET;

function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(input) {
    let str = input.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Genera un token JWT estándar (HS256) sin dependencias externas
 */
function generarToken(user) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        cedula: user.cedula,
        correo: user.correo,
        nombre: user.nombre,
        apellido: user.apellido,
        nombre_rol: user.nombre_rol,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12, // 12 horas
    };

    const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
}

function generarTokenMfa(user) {
    if (!MFA_JWT_SECRET) {
        throw new Error('MFA_JWT_SECRET no está configurada.');
    }

    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        cedula: user.cedula,
        purpose: 'mfa-verification',
        iat: now,
        exp: now + 60 * 5,
    };

    const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signature = crypto
        .createHmac('sha256', MFA_JWT_SECRET)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
}

function verificarTokenMfa(token) {
    if (!MFA_JWT_SECRET) {
        throw new Error('MFA_JWT_SECRET no está configurada.');
    }

    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw new Error('Formato de token MFA inválido');

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
        .createHmac('sha256', MFA_JWT_SECRET)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    ) {
        throw new Error('Firma del token MFA inválida.');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.purpose !== 'mfa-verification') {
        throw new Error('Propósito del token MFA inválido.');
    }
    if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) {
        throw new Error('El token MFA ha expirado.');
    }
    if (!payload.cedula) {
        throw new Error('El token MFA no identifica al usuario.');
    }

    return payload;
}

function verificarToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Formato de token inválido');

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    if (signature !== expectedSignature) {
        throw new Error('Firma JWT inválida');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        throw new Error('El token ha expirado');
    }

    return payload;
}

/**
 * Middleware autenticar(): valida el header Authorization: Bearer <token>
 */
function autenticar(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de autenticación no proporcionado.' });
    }

    const token = authHeader.slice(7);
    try {
        req.user = verificarToken(token);
        next();
    } catch (error) {
        return res.status(401).json({ message: error.message || 'Token inválido.' });
    }
}

/**
 * Middleware permitirRoles(): autoriza únicamente a los roles permitidos ('Administrador', 'Usuario')
 */
function permitirRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado.' });
        }
        if (!rolesPermitidos.includes(req.user.nombre_rol)) {
            return res.status(403).json({
                message: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}.`,
            });
        }
        next();
    };
}

module.exports = {
    generarToken,
    generarTokenMfa,
    verificarTokenMfa,
    verificarToken,
    autenticar,
    permitirRoles,
};
