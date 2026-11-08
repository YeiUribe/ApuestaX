const express = require('express');

const router = express.Router();

const pgPool = require('../../config/postgres');
const mongoose = require('../../config/mongo');

const { LoginAudit } = require('../rules/mongoSchemas');
const { PaymentService } = require('../../services');

const {
    syncPaymentToFirebase,
} = require('../../services/firebasePaymentService');

const WOMPI_PUBLIC_KEY =
    process.env.WOMPI_PUBLIC_KEY || 'pub_test_ApuestaXSandbox2026';


// ============================================================
// 1. PREPARAR PAGO
// POST /api/payments/prepare
// ============================================================

router.post('/prepare', async (req, res) => {
    try {
        const {
            cedula_usuario,
            monto,
            banco_origen = 'Bancolombia',
            concepto = 'Recarga PSE',
        } = req.body;

        const numericAmount = Number(monto);

        if (!cedula_usuario || !numericAmount || numericAmount < 10000) {
            return res.status(400).json({
                message:
                    'El monto mínimo de transacción PSE / Wompi es de $10,000 COP.',
            });
        }

        const reference =
            `PSE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

        const amountInCents = Math.round(numericAmount * 100);

        const currency = 'COP';

        const signature = PaymentService.generateWompiSignature(
            reference,
            amountInCents,
            currency
        );

        // Registrar inicialmente el pago como pendiente en Firebase
        syncPaymentToFirebase(reference, {
            cedula_usuario,
            banco_origen,
            monto_cop: numericAmount,
            estado: 'PENDING',
            concepto,
        }).catch((firebaseError) => {
            console.error(
                `[Firebase] No se pudo registrar el pago pendiente ${reference}:`,
                firebaseError.message
            );
        });

        return res.json({
            reference,
            amountInCents,
            currency,
            signature,
            publicKey: WOMPI_PUBLIC_KEY,
            cedula_usuario,
            banco_origen,
            concepto,
        });
    } catch (error) {
        console.error(
            '[Payments Prepare] Error preparando pago:',
            error.message
        );

        return res.status(500).json({
            message: 'Error preparando la transacción.',
            error: error.message,
        });
    }
});


// ============================================================
// 2. WEBHOOK WOMPI
// POST /api/payments/webhook
// ============================================================

router.post('/webhook', async (req, res) => {

    // --------------------------------------------------------
    // Validar firma/checksum del evento
    // --------------------------------------------------------

    if (!PaymentService.verifyWompiWebhookChecksum(req.body)) {
        return res.status(401).json({
            message: 'Firma de evento Webhook Wompi inválida.',
        });
    }


    // --------------------------------------------------------
    // Extraer información recibida
    // --------------------------------------------------------

    const wompiTx = req.body?.data?.transaction;

    const reference =
        wompiTx?.reference ||
        req.body.reference;

    const status =
        wompiTx?.status ||
        req.body.status ||
        'APPROVED';

    const amountInCents =
        wompiTx?.amount_in_cents ||
        req.body.amountInCents;

    const cedula_usuario =
        wompiTx?.customer_data?.legal_id ||
        req.body.cedula_usuario;

    const banco_origen =
        wompiTx?.payment_method?.extra?.financial_institution_code ||
        req.body.banco_origen ||
        'Wompi / PSE';


    // --------------------------------------------------------
    // Validación de datos
    // --------------------------------------------------------

    if (!reference || !cedula_usuario || !amountInCents) {
        return res.status(400).json({
            message: 'Datos de webhook incompletos.',
        });
    }


    const montoCop =
        (Number(amountInCents) / 100).toFixed(2);


    // ========================================================
    // PAGO NO APROBADO
    // ========================================================

    if (status !== 'APPROVED') {

        // Registrar auditoría en MongoDB
        if (mongoose.connection.readyState === 1) {
            await LoginAudit.create({
                cedula_usuario,
                ip_conexion: req.ip || '127.0.0.1',
                estado_intento: status,
                tipo_evento: 'PAYMENT_DECLINED',

                detalle: {
                    reference,
                    banco_origen,
                    monto: Number(montoCop),
                },
            }).catch((mongoError) => {
                console.error(
                    '[MongoDB] Error registrando pago no aprobado:',
                    mongoError.message
                );
            });
        }


        // Actualizar estado en Firebase
        syncPaymentToFirebase(reference, {
            cedula_usuario,
            banco_origen,
            monto_cop: Number(montoCop),
            estado: status,
        }).catch((firebaseError) => {
            console.error(
                `[Firebase] No se pudo actualizar ${reference}:`,
                firebaseError.message
            );
        });


        return res.json({
            reference,
            status,
            message:
                `Transacción ${reference} finalizó con estado ${status}. ` +
                'No se afectó el saldo.',
        });
    }


    // ========================================================
    // PAGO APROBADO
    // ========================================================

    const client = await pgPool.connect();

    try {

        // ----------------------------------------------------
        // Iniciar transacción PostgreSQL
        // ----------------------------------------------------

        await client.query('BEGIN');

        // ----------------------------------------------------
        // Verificar si el pago ya fue procesado
        // ----------------------------------------------------

        const paymentExists = await client.query(
            `
    SELECT 1
    FROM historial_billetera
    WHERE referencia_externa = $1
    LIMIT 1
    `,
            [reference]
        );

        if (paymentExists.rowCount > 0) {
            await client.query('ROLLBACK');

            console.log(
                `[Payments Webhook] Transacción duplicada ignorada: ${reference}`
            );

            syncPaymentToFirebase(reference, {
                cedula_usuario,
                banco_origen,
                monto_cop: Number(montoCop),
                estado: 'APPROVED',
                webhook_duplicado: true,
            }).catch((firebaseError) => {
                console.error(
                    `[Firebase] Error registrando webhook duplicado ${reference}:`,
                    firebaseError.message
                );
            });

            return res.status(200).json({
                message: 'La transacción ya había sido procesada anteriormente.',
                reference,
                status: 'APPROVED',
                duplicated: true,
            });
        }

        // ----------------------------------------------------
        // Crear billetera si todavía no existe
        // ----------------------------------------------------

        await client.query(
            `
            INSERT INTO billetera (
                cedula_usuario,
                saldo_disponible
            )
            VALUES ($1, 0.00)
            ON CONFLICT (cedula_usuario) DO NOTHING
            `,
            [cedula_usuario]
        );


        // ----------------------------------------------------
        // Bloquear billetera mientras actualizamos el saldo
        // ----------------------------------------------------

        const walletRes = await client.query(
            `
            SELECT saldo_disponible
            FROM billetera
            WHERE cedula_usuario = $1
            FOR UPDATE
            `,
            [cedula_usuario]
        );


        const saldoActual =
            Number(walletRes.rows[0].saldo_disponible);

        const nuevoSaldo =
            (saldoActual + Number(montoCop)).toFixed(2);


        // ----------------------------------------------------
        // Actualizar billetera
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE billetera
            SET
                saldo_disponible = $1,
                ultima_actualizacion = CURRENT_TIMESTAMP
            WHERE cedula_usuario = $2
            `,
            [
                nuevoSaldo,
                cedula_usuario,
            ]
        );


        // ----------------------------------------------------
        // Crear tipo de transacción si no existe
        // ----------------------------------------------------

        await client.query(
            `
            INSERT INTO tipo_transaccion (
                nombre_tipo,
                naturaleza_movimiento
            )
            VALUES (
                'Recarga PSE',
                'Ingreso'
            )
            ON CONFLICT (nombre_tipo) DO NOTHING
            `
        );


        // ----------------------------------------------------
        // Registrar movimiento
        // ----------------------------------------------------

        await client.query(
            `
    INSERT INTO historial_billetera (
        cedula_usuario,
        nombre_tipo,
        monto,
        referencia_externa
    )
    VALUES (
        $1,
        'Recarga PSE',
        $2,
        $3
    )
    `,
            [
                cedula_usuario,
                montoCop,
                reference,
            ]
        );


        // ----------------------------------------------------
        // Confirmar transacción
        // ----------------------------------------------------

        await client.query('COMMIT');


        // ----------------------------------------------------
        // Auditoría en MongoDB
        // ----------------------------------------------------

        if (mongoose.connection.readyState === 1) {

            await LoginAudit.create({
                cedula_usuario,
                ip_conexion:
                    req.ip || '127.0.0.1',

                estado_intento:
                    'APPROVED',

                tipo_evento:
                    'PAYMENT_APPROVED',

                detalle: {
                    reference,
                    banco_origen,
                    monto: Number(montoCop),
                },

            }).catch((mongoError) => {

                console.error(
                    '[MongoDB] Error registrando pago aprobado:',
                    mongoError.message
                );

            });
        }


        // ----------------------------------------------------
        // Sincronizar Firebase
        // ----------------------------------------------------

        syncPaymentToFirebase(reference, {

            cedula_usuario,

            banco_origen,

            monto_cop:
                Number(montoCop),

            nuevo_saldo:
                Number(nuevoSaldo),

            estado:
                'APPROVED',

        }).catch((firebaseError) => {

            console.error(
                `[Firebase] No se pudo sincronizar el pago aprobado ${reference}:`,
                firebaseError.message
            );

        });


        // ----------------------------------------------------
        // Respuesta
        // ----------------------------------------------------

        return res.json({

            message:
                'Pago aprobado y acreditado en billetera.',

            reference,

            status:
                'APPROVED',

            banco_origen,

            monto_acreditado:
                Number(montoCop),

            nuevo_saldo:
                Number(nuevoSaldo),

        });

    } catch (error) {

        await client.query('ROLLBACK');

        console.error(
            '[Payments Webhook] Error procesando recarga:',
            error.message
        );

        return res.status(500).json({
            message:
                'Error al acreditar el pago en billetera.',

            error:
                error.message,
        });

    } finally {

        client.release();

    }
});


module.exports = router;