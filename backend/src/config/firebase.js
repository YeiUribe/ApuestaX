const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const fs = require('fs');
const path = require('path');

let serviceAccount;

const localKeyPath = path.join(__dirname, 'firebase-key.json');

// ============================================================
// FIREBASE CREDENTIALS
// ============================================================

// Desarrollo local:
// utiliza firebase-key.json.
//
// Azure:
// utiliza el JSON completo codificado en Base64.
if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const decodedCredentials = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_B64,
        'base64'
    ).toString('utf8');

    serviceAccount = JSON.parse(decodedCredentials);

    console.log(
        '[Firebase] Credenciales cargadas desde Azure'
    );
} else if (fs.existsSync(localKeyPath)) {
    serviceAccount = require(localKeyPath);

    console.log(
        '[Firebase] Credenciales cargadas desde firebase-key.json local'
    );
} else {
    throw new Error(
        '[Firebase] No se encontraron credenciales de Firebase Admin'
    );
}

// ============================================================
// FIREBASE ADMIN
// ============================================================

const firebaseApp =
    getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount)
        })
        : getApps()[0];

// Firestore
const dbFirebase = getFirestore(firebaseApp);

// Authentication
const authFirebase = getAuth(firebaseApp);

console.log(
    '[Firebase] Firebase Admin inicializado correctamente'
);

console.log(
    '[Firebase] Firebase Authentication inicializado correctamente'
);

// ============================================================
// EXPORTACIONES
// ============================================================

// Conservamos el comportamiento anterior:
// require('./config/firebase') sigue devolviendo Firestore.
module.exports = dbFirebase;

// Agregamos Authentication sin romper código existente.
module.exports.authFirebase = authFirebase;