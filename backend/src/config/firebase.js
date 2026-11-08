const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

let serviceAccount;

const localKeyPath = path.join(__dirname, 'firebase-key.json');

// ============================================================
// CREDENCIALES FIREBASE
// ============================================================

// Desarrollo local:
// usa firebase-key.json si existe.
//
// Azure / producción:
// usa variables de entorno y NO necesita firebase-key.json.
if (fs.existsSync(localKeyPath)) {
    serviceAccount = require(localKeyPath);

    console.log(
        '[Firebase] Credenciales cargadas desde firebase-key.json'
    );
} else {
    const requiredVariables = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY'
    ];

    const missingVariables = requiredVariables.filter(
        (variable) => !process.env[variable]
    );

    if (missingVariables.length > 0) {
        throw new Error(
            `[Firebase] Faltan variables de entorno: ${missingVariables.join(', ')}`
        );
    }

    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,

        // Azure guarda los saltos de línea como \n.
        // Firebase necesita convertirlos nuevamente a saltos reales.
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };

    console.log(
        '[Firebase] Credenciales cargadas desde variables de entorno'
    );
}

// ============================================================
// INICIALIZAR FIREBASE ADMIN
// ============================================================

const firebaseApp =
    getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount)
        })
        : getApps()[0];

const dbFirebase = getFirestore(firebaseApp);

console.log('[Firebase] Firebase Admin inicializado');

module.exports = dbFirebase;