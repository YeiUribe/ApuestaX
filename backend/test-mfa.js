const {
    generarConfiguracionMfa,
    validarCodigoMfa,
} = require('./src/modules/mfa/mfaService');

async function probarMfa() {
    console.log('=== PRUEBA MFA APUESTAX ===\n');

    const configuracion =
        await generarConfiguracionMfa(
            'prueba@apuestax.com'
        );

    console.log(
        'Secreto generado:',
        configuracion.secret
    );

    console.log(
        '\nURI Authenticator:',
        configuracion.otpauthUrl
    );

    console.log(
        '\nQR generado correctamente:',
        configuracion.qrCode.startsWith(
            'data:image/png;base64,'
        )
    );

    // Generar un código TOTP únicamente para comprobar
    // que la validación funciona.
    const { authenticator } =
        require('otplib');

    const codigo =
        authenticator.generate(
            configuracion.secret
        );

    console.log(
        '\nCódigo TOTP de prueba:',
        codigo
    );

    const valido =
        validarCodigoMfa(
            codigo,
            configuracion.secret
        );

    console.log(
        'Código válido:',
        valido
    );
}

probarMfa().catch((error) => {
    console.error(
        'Error probando MFA:',
        error
    );

    process.exit(1);
});