const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// ============================================================
// CONFIGURACIÓN MFA / TOTP
// ============================================================

authenticator.options = {
    step: 30,
    window: 1,
};

// ============================================================
// GENERAR CONFIGURACIÓN MFA
// ============================================================

async function generarConfiguracionMfa(correo) {
    if (!correo) {
        throw new Error(
            'El correo es obligatorio para configurar MFA.'
        );
    }

    const secret =
        authenticator.generateSecret();

    const otpauthUrl =
        authenticator.keyuri(
            correo,
            'ApuestaX',
            secret
        );

    const qrCode =
        await QRCode.toDataURL(
            otpauthUrl
        );

    return {
        secret,
        otpauthUrl,
        qrCode,
    };
}

// ============================================================
// VALIDAR CÓDIGO MFA
// ============================================================

function validarCodigoMfa(
    codigo,
    secret
) {
    if (!codigo || !secret) {
        return false;
    }

    const codigoNormalizado =
        String(codigo).trim();

    if (!/^\d{6}$/.test(
        codigoNormalizado
    )) {
        return false;
    }

    try {
        return authenticator.verify({
            token: codigoNormalizado,
            secret,
        });
    } catch (error) {
        console.error(
            '[MFA] Error validando código:',
            error.message
        );

        return false;
    }
}

module.exports = {
    generarConfiguracionMfa,
    validarCodigoMfa,
};