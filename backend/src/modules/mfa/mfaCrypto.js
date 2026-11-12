const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    const key = Buffer.from(
        process.env.MFA_ENCRYPTION_KEY || '',
        'base64'
    );

    if (key.length !== 32) {
        throw new Error(
            'MFA_ENCRYPTION_KEY debe ser una clave Base64 de exactamente 32 bytes.'
        );
    }

    return key;
}

function cifrarSecreto(secreto) {
    if (!secreto) {
        throw new Error('El secreto MFA es obligatorio.');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        getEncryptionKey(),
        iv
    );
    const cipherText = Buffer.concat([
        cipher.update(String(secreto), 'utf8'),
        cipher.final(),
    ]);

    return [
        iv.toString('base64'),
        cipher.getAuthTag().toString('base64'),
        cipherText.toString('base64'),
    ].join(':');
}

function descifrarSecreto(valorCifrado) {
    const parts = String(valorCifrado || '').split(':');
    if (parts.length !== 3) {
        throw new Error('Formato de secreto MFA cifrado inválido.');
    }

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        Buffer.from(parts[0], 'base64')
    );
    decipher.setAuthTag(Buffer.from(parts[1], 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(parts[2], 'base64')),
        decipher.final(),
    ]).toString('utf8');
}

module.exports = {
    cifrarSecreto,
    descifrarSecreto,
};
