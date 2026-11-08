const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase-key.json');

const firebaseApp =
    getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount),
        })
        : getApps()[0];

const dbFirebase = getFirestore(firebaseApp);

module.exports = dbFirebase;