const {
    syncPaymentToFirebase,
} = require('./services/firebasePaymentService');

async function probarFirebase() {
    try {

        const resultado =
            await syncPaymentToFirebase(
                'PRUEBA-APUESTAX-001',
                {
                    estado: 'APPROVED',
                    monto: 50000,
                    moneda: 'COP',
                    metodoPago: 'PSE',
                    proveedor: 'Wompi',
                    ambiente: 'prueba',
                }
            );

        console.log(
            '✅ Prueba terminada correctamente'
        );

        console.log(resultado);

        process.exit(0);

    } catch (error) {

        console.error(
            '❌ Error durante la prueba de Firebase'
        );

        console.error(error);

        process.exit(1);
    }
}

probarFirebase();