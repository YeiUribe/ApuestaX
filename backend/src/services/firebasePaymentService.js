const dbFirebase = require('../config/firebase');

async function syncPaymentToFirebase(reference, payload) {
    if (!reference) {
        throw new Error('La referencia del pago es obligatoria');
    }

    const record = {
        ...payload,
        reference: String(reference),
        syncedAt: new Date().toISOString(),
    };

    await dbFirebase
        .collection('pagos_wompi')
        .doc(String(reference))
        .set(record, { merge: true });

    console.log(
        `[Firebase] Pago sincronizado: ${reference} (${record.estado || 'SIN_ESTADO'})`
    );

    return {
        synced: true,
        reference: String(reference),
    };
}

module.exports = {
    syncPaymentToFirebase,
};