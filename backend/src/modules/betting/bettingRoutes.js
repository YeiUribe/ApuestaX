const express = require('express');
const { randomUUID } = require('crypto');

const router = express.Router();

const pgPool = require('../../config/postgres');
const {
    poolPromise: sqlServerPool,
    sql,
} = require('../../config/sqlServer');

const mysqlPool = require('../../config/mysql');
const mongoose = require('../../config/mongo');

const {
    Regla,
    MercadoApuesta,
    LoginAudit,
} = require('../rules/mongoSchemas');

const { PaymentService } = require('../../services');


// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

const isPositiveNumber = (value) => {
    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number > 0
    );
};

const generateTicketCode = () => {
    const uniquePart = randomUUID()
        .replace(/-/g, '')
        .slice(0, 12)
        .toUpperCase();

    return `TICK-${uniquePart}`;
};

const createAudit = async ({
    cedula_usuario,
    req,
    estado_intento,
    tipo_evento,
    detalle,
}) => {
    if (mongoose.connection.readyState !== 1) {
        return;
    }

    try {
        await LoginAudit.create({
            cedula_usuario,
            ip_conexion:
                req.ip || '127.0.0.1',
            estado_intento,
            tipo_evento,
            detalle,
        });
    } catch (error) {
        console.error(
            `[MongoDB] Error registrando auditoría ${tipo_evento}:`,
            error.message
        );
    }
};


// ============================================================
// 1. CONSULTAR BILLETERA
// GET /api/betting/wallet/:cedula
// ============================================================

router.get('/wallet/:cedula', async (req, res) => {
    const { cedula } = req.params;

    if (!cedula?.trim()) {
        return res.status(400).json({
            message: 'La cédula es obligatoria.',
        });
    }

    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        let result = await client.query(
            `
            SELECT
                cedula_usuario,
                saldo_disponible,
                ultima_actualizacion
            FROM billetera
            WHERE cedula_usuario = $1
            `,
            [cedula]
        );

        const WELCOME_BONUS = 20000;

        if (result.rows.length === 0) {
            result = await client.query(
                `
                INSERT INTO billetera (
                    cedula_usuario,
                    saldo_disponible
                )
                VALUES ($1, $2)
                RETURNING
                    cedula_usuario,
                    saldo_disponible,
                    ultima_actualizacion
                `,
                [cedula, WELCOME_BONUS]
            );

            await client.query(
                `
                INSERT INTO tipo_transaccion (nombre_tipo, naturaleza_movimiento)
                VALUES ('Bono Bienvenida', 'Ingreso')
                ON CONFLICT (nombre_tipo) DO NOTHING
                `
            );

            await client.query(
                `
                INSERT INTO historial_billetera (cedula_usuario, nombre_tipo, monto, referencia_externa)
                VALUES ($1, 'Bono Bienvenida', $2, $3)
                `,
                [cedula, WELCOME_BONUS, `BIENVENIDA-${cedula}`]
            );
        } else {
            // Si la billetera fue creada en $0 y aún no tiene ningún movimiento (usuario recién registrado),
            // acredita el Bono de Bienvenida de $20.000 COP para que pueda apostar.
            const countRes = await client.query(
                `SELECT COUNT(*)::int AS total FROM historial_billetera WHERE cedula_usuario = $1`,
                [cedula]
            );
            const ticketsCountRes = await client.query(
                `SELECT COUNT(*)::int AS total FROM ticket_apuesta WHERE cedula_usuario = $1`,
                [cedula]
            );

            if (
                Number(result.rows[0].saldo_disponible) === 0 &&
                countRes.rows[0].total === 0 &&
                ticketsCountRes.rows[0].total === 0 &&
                !['1000000001', '1000000002'].includes(String(cedula))
            ) {
                result = await client.query(
                    `
                    UPDATE billetera
                    SET saldo_disponible = $1,
                        ultima_actualizacion = CURRENT_TIMESTAMP
                    WHERE cedula_usuario = $2
                    RETURNING cedula_usuario, saldo_disponible, ultima_actualizacion
                    `,
                    [WELCOME_BONUS, cedula]
                );

                await client.query(
                    `
                    INSERT INTO tipo_transaccion (nombre_tipo, naturaleza_movimiento)
                    VALUES ('Bono Bienvenida', 'Ingreso')
                    ON CONFLICT (nombre_tipo) DO NOTHING
                    `
                );

                await client.query(
                    `
                    INSERT INTO historial_billetera (cedula_usuario, nombre_tipo, monto, referencia_externa)
                    VALUES ($1, 'Bono Bienvenida', $2, $3)
                    `,
                    [cedula, WELCOME_BONUS, `BIENVENIDA-${cedula}`]
                );
            }
        }

        const historyResult = await client.query(
            `
            SELECT
                h.cedula_usuario,
                h.fecha_hora,
                h.nombre_tipo,
                h.monto,
                h.referencia_externa,
                t.naturaleza_movimiento
            FROM historial_billetera h
            LEFT JOIN tipo_transaccion t
                ON h.nombre_tipo = t.nombre_tipo
            WHERE h.cedula_usuario = $1
            ORDER BY h.fecha_hora DESC
            LIMIT 30
            `,
            [cedula]
        );

        await client.query('COMMIT');

        return res.json({
            ...result.rows[0],
            movimientos: historyResult.rows,
        });
    } catch (error) {
        await client.query('ROLLBACK');

        console.error(
            '[Betting Module] Error al consultar billetera:',
            error.message
        );

        return res.status(500).json({
            message: 'Error consultando billetera.',
        });
    } finally {
        client.release();
    }
});


// ============================================================
// 1.1 RECARGA MANUAL
// POST /api/betting/wallet/recharge
// ============================================================

router.post('/wallet/recharge', async (req, res) => {
    const {
        cedula_usuario,
        monto,
        nombre_tipo = 'Recarga Manual',
        reference,
        referencia_externa,
        amountInCents,
        currency = 'COP',
        signature,
        status,
    } = req.body;

    const numericMonto = Number(monto);
    const referenciaIdempotente =
        (referencia_externa || reference || '').trim() || null;

    if (
        !cedula_usuario ||
        !isPositiveNumber(numericMonto)
    ) {
        return res.status(400).json({
            message:
                'Ingresa una cédula y un monto válido para recargar.',
        });
    }

    // Si es una recarga PSE / Pasarela Wompi, exigir evidencia válida de aprobación
    // (status === 'APPROVED', referencia PSE y firma de integridad SHA-256 válida)
    if (nombre_tipo === 'Recarga PSE') {
        const expectedCents =
            Number(amountInCents) || Math.round(numericMonto * 100);

        const expectedSignature =
            referenciaIdempotente
                ? PaymentService.generateWompiSignature(
                      referenciaIdempotente,
                      expectedCents,
                      currency || 'COP'
                  )
                : null;

        if (
            status !== 'APPROVED' ||
            !referenciaIdempotente ||
            !signature ||
            signature !== expectedSignature
        ) {
            return res.status(401).json({
                message:
                    'No existe evidencia válida de aprobación de la pasarela Wompi / PSE para acreditar esta recarga.',
            });
        }
    }

    let minRecarga = 10000;

    if (mongoose.connection.readyState === 1) {
        try {
            const reglaMin = await Regla.findOne({
                codigo_regla: 'MIN_RECARGA',
            });

            if (reglaMin?.valor_numerico) {
                minRecarga =
                    Number(reglaMin.valor_numerico);
            }
        } catch (error) {
            console.error(
                '[MongoDB] Error consultando MIN_RECARGA:',
                error.message
            );
        }
    }

    if (numericMonto < minRecarga) {
        return res.status(400).json({
            message:
                `El monto mínimo de recarga es de $${minRecarga.toLocaleString(
                    'es-CO'
                )} COP.`,
        });
    }

    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

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

        const walletResult = await client.query(
            `
            SELECT saldo_disponible
            FROM billetera
            WHERE cedula_usuario = $1
            FOR UPDATE
            `,
            [cedula_usuario]
        );

        const saldoActual =
            Number(walletResult.rows[0].saldo_disponible);

        // Idempotencia: impedir que una misma referencia PSE/Wompi se acredite dos veces
        if (referenciaIdempotente) {
            const existingTx = await client.query(
                `
                SELECT monto, fecha_hora
                FROM historial_billetera
                WHERE referencia_externa = $1
                LIMIT 1
                `,
                [referenciaIdempotente]
            );

            if (existingTx.rowCount > 0) {
                await client.query('ROLLBACK');

                return res.status(200).json({
                    message:
                        'La transacción ya había sido procesada anteriormente.',
                    persisted: true,
                    duplicated: true,
                    reference: referenciaIdempotente,
                    cedula_usuario,
                    monto_recargado: Number(existingTx.rows[0].monto),
                    nuevo_saldo: saldoActual,
                });
            }
        }

        const nuevoSaldo =
            (saldoActual + numericMonto).toFixed(2);

        await client.query(
            `
            UPDATE billetera
            SET
                saldo_disponible = $1,
                ultima_actualizacion = CURRENT_TIMESTAMP
            WHERE cedula_usuario = $2
            `,
            [nuevoSaldo, cedula_usuario]
        );

        await client.query(
            `
            INSERT INTO tipo_transaccion (
                nombre_tipo,
                naturaleza_movimiento
            )
            VALUES ($1, 'Ingreso')
            ON CONFLICT (nombre_tipo) DO NOTHING
            `,
            [nombre_tipo]
        );

        const insertHistoryRes = await client.query(
            `
            INSERT INTO historial_billetera (
                cedula_usuario,
                nombre_tipo,
                monto,
                referencia_externa
            )
            VALUES ($1, $2, $3, $4)
            RETURNING cedula_usuario, fecha_hora, nombre_tipo, monto, referencia_externa
            `,
            [
                cedula_usuario,
                nombre_tipo,
                numericMonto,
                referenciaIdempotente,
            ]
        );

        await client.query('COMMIT');

        return res.json({
            message:
                'Recarga acreditada exitosamente.',
            persisted: true,
            duplicated: false,
            reference: referenciaIdempotente,
            cedula_usuario,
            monto_recargado: numericMonto,
            nuevo_saldo: Number(nuevoSaldo),
            movimiento: insertHistoryRes.rows[0] || null,
        });
    } catch (error) {
        await client.query('ROLLBACK');

        console.error(
            '[Betting Module] Error en recarga:',
            error.message
        );

        return res.status(400).json({
            message:
                error.message ||
                'No se pudo procesar la recarga.',
        });
    } finally {
        client.release();
    }
});


// ============================================================
// 1.2 RETIRAR FONDOS
// POST /api/betting/wallet/withdraw
// ============================================================

router.post('/wallet/withdraw', async (req, res) => {
    const {
        cedula_usuario,
        monto,
    } = req.body;

    const numericMonto = Number(monto);

    if (
        !cedula_usuario ||
        !isPositiveNumber(numericMonto)
    ) {
        return res.status(400).json({
            message:
                'Ingresa una cédula y un monto válido para retirar.',
        });
    }

    let minRetiro = 20000;

    if (mongoose.connection.readyState === 1) {
        try {
            const reglaRetiro = await Regla.findOne({
                codigo_regla: 'MIN_RETIRO',
            });

            if (reglaRetiro?.valor_numerico) {
                minRetiro =
                    Number(reglaRetiro.valor_numerico);
            }
        } catch (error) {
            console.error(
                '[MongoDB] Error consultando MIN_RETIRO:',
                error.message
            );
        }
    }

    if (numericMonto < minRetiro) {
        return res.status(400).json({
            message:
                `El monto mínimo de retiro es de $${minRetiro.toLocaleString(
                    'es-CO'
                )} COP.`,
        });
    }

    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        const walletResult = await client.query(
            `
            SELECT saldo_disponible
            FROM billetera
            WHERE cedula_usuario = $1
            FOR UPDATE
            `,
            [cedula_usuario]
        );

        if (walletResult.rows.length === 0) {
            throw new Error(
                'No se encontró billetera para este usuario.'
            );
        }

        const saldoActual =
            Number(walletResult.rows[0].saldo_disponible);

        if (saldoActual < numericMonto) {
            throw new Error(
                `Saldo insuficiente. Disponible: $${saldoActual.toLocaleString(
                    'es-CO'
                )} COP.`
            );
        }

        const nuevoSaldo =
            (saldoActual - numericMonto).toFixed(2);

        await client.query(
            `
            UPDATE billetera
            SET
                saldo_disponible = $1,
                ultima_actualizacion = CURRENT_TIMESTAMP
            WHERE cedula_usuario = $2
            `,
            [nuevoSaldo, cedula_usuario]
        );

        await client.query(
            `
            INSERT INTO tipo_transaccion (
                nombre_tipo,
                naturaleza_movimiento
            )
            VALUES ('Retiro Bancario', 'Egreso')
            ON CONFLICT (nombre_tipo) DO NOTHING
            `
        );

        await client.query(
            `
            INSERT INTO historial_billetera (
                cedula_usuario,
                nombre_tipo,
                monto
            )
            VALUES (
                $1,
                'Retiro Bancario',
                $2
            )
            `,
            [
                cedula_usuario,
                numericMonto,
            ]
        );

        await client.query('COMMIT');

        return res.json({
            message:
                'Solicitud de retiro procesada exitosamente.',
            cedula_usuario,
            monto_retirado: numericMonto,
            nuevo_saldo: Number(nuevoSaldo),
        });
    } catch (error) {
        await client.query('ROLLBACK');

        console.error(
            '[Betting Module] Error en retiro:',
            error.message
        );

        return res.status(400).json({
            message:
                error.message ||
                'No se pudo procesar el retiro.',
        });
    } finally {
        client.release();
    }
});


// ============================================================
// 2. CONSULTAR CUOTAS
// ============================================================

router.get('/odds', async (req, res) => {
    try {
        const result = await pgPool.query(
            `
            SELECT
                codigo_partido,
                nombre_mercado,
                multiplicador_fijado
            FROM cuota_partido
            ORDER BY
                codigo_partido,
                nombre_mercado
            `
        );

        return res.json(result.rows);
    } catch (error) {
        console.error(
            '[Betting Module] Error consultando cuotas:',
            error.message
        );

        return res.status(500).json({
            message: 'Error consultando cuotas.',
        });
    }
});


router.get('/odds/:codigo_partido', async (req, res) => {
    const { codigo_partido } = req.params;

    try {
        const result = await pgPool.query(
            `
            SELECT
                codigo_partido,
                nombre_mercado,
                multiplicador_fijado
            FROM cuota_partido
            WHERE codigo_partido = $1
            `,
            [codigo_partido]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error(
            '[Betting Module] Error consultando cuotas:',
            error.message
        );

        return res.status(500).json({
            message: 'Error consultando cuotas.',
        });
    }
});


// ============================================================
// 3. CREAR APUESTA
// POST /api/betting/tickets
// ============================================================

router.post('/tickets', async (req, res) => {
    const {
        cedula_usuario,
        monto_total,
        lineas,
        origen_fondos = 'Billetera',
        banco_origen = 'Bancolombia',
        nit_empresa = '900123456-1',
    } = req.body;

    const numericMonto =
        Number(monto_total);

    if (
        !cedula_usuario ||
        !isPositiveNumber(numericMonto) ||
        !Array.isArray(lineas) ||
        lineas.length === 0
    ) {
        return res.status(400).json({
            message:
                'Datos de apuesta incompletos o inválidos.',
        });
    }

    if (
        !['Billetera', 'PSE'].includes(origen_fondos)
    ) {
        return res.status(400).json({
            message:
                'El origen de fondos debe ser Billetera o PSE.',
        });
    }

    for (const linea of lineas) {
        if (
            !linea?.codigo_partido ||
            !linea?.nombre_mercado ||
            !isPositiveNumber(
                linea?.valor_cuota_congelada
            ) ||
            Number(linea.valor_cuota_congelada) <= 1
        ) {
            return res.status(400).json({
                message:
                    'Cada línea debe incluir partido, mercado y una cuota válida mayor que 1.',
            });
        }
    }

    try {
        // ----------------------------------------------------
        // SQL Server: usuario obligatorio y activo
        // ----------------------------------------------------

        const sqlPool = await sqlServerPool;

        if (!sqlPool) {
            return res.status(503).json({
                message:
                    'No fue posible validar el usuario en SQL Server.',
            });
        }

        const userCheck = await sqlPool
            .request()
            .input(
                'cedula',
                sql.VarChar(20),
                cedula_usuario
            )
            .query(
                `
                SELECT cedula, estado
                FROM usuario
                WHERE cedula = @cedula
                `
            );

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({
                message:
                    'El usuario no existe en SQL Server.',
            });
        }

        if (
            userCheck.recordset[0].estado !== 'Activo'
        ) {
            return res.status(403).json({
                message:
                    'La cuenta está inactiva y no puede registrar apuestas.',
            });
        }

        // ----------------------------------------------------
        // MySQL: validar partidos
        // ----------------------------------------------------

        if (!mysqlPool) {
            return res.status(503).json({
                message:
                    'No fue posible validar los partidos en MySQL.',
            });
        }

        for (const linea of lineas) {
            const [partidoRows] =
                await mysqlPool.query(
                    `
                    SELECT
                        codigo_partido,
                        estado_partido
                    FROM partido
                    WHERE codigo_partido = ?
                    `,
                    [linea.codigo_partido]
                );

            if (partidoRows.length === 0) {
                return res.status(404).json({
                    message:
                        `El partido ${linea.codigo_partido} no existe.`,
                });
            }

            if (
                partidoRows[0].estado_partido ===
                'Cancelado'
            ) {
                return res.status(400).json({
                    message:
                        `El partido ${linea.codigo_partido} fue cancelado.`,
                });
            }

            if (
                [
                    'Finalizado',
                    'Cerrado',
                    'Suspendido',
                ].includes(
                    partidoRows[0].estado_partido
                )
            ) {
                return res.status(400).json({
                    message:
                        `El partido ${linea.codigo_partido} no admite apuestas porque está ${partidoRows[0].estado_partido}.`,
                });
            }
        }

        // ----------------------------------------------------
        // MongoDB: tope máximo
        // ----------------------------------------------------

        if (mongoose.connection.readyState === 1) {
            const maxRule = await Regla.findOne({
                codigo_regla: 'MAX_APUESTA',
            });

            if (
                maxRule &&
                numericMonto >
                Number(maxRule.valor_numerico)
            ) {
                return res.status(400).json({
                    message:
                        `El monto supera el máximo permitido de $${Number(
                            maxRule.valor_numerico
                        ).toLocaleString('es-CO')} COP.`,
                });
            }

            for (const linea of lineas) {
                const market = await MercadoApuesta
                    .findOne({
                        nombre_mercado:
                            linea.nombre_mercado,
                    })
                    .catch(() => null);

                if (
                    market &&
                    market.activo === false
                ) {
                    return res.status(400).json({
                        message:
                            `El mercado ${linea.nombre_mercado} está inactivo.`,
                    });
                }
            }
        }
    } catch (validationError) {
        console.error(
            '[Betting Module] Error en validación multibase:',
            validationError.message
        );

        return res.status(503).json({
            message:
                'No fue posible validar la apuesta en las bases de datos.',
            error: validationError.message,
        });
    }

    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        let nuevoSaldo = null;

        if (origen_fondos === 'Billetera') {
            await client.query(
                `
                INSERT INTO billetera (cedula_usuario, saldo_disponible)
                VALUES ($1, 20000.00)
                ON CONFLICT (cedula_usuario) DO NOTHING
                `,
                [cedula_usuario]
            );

            const walletResult =
                await client.query(
                    `
                    SELECT saldo_disponible
                    FROM billetera
                    WHERE cedula_usuario = $1
                    FOR UPDATE
                    `,
                    [cedula_usuario]
                );

            if (
                walletResult.rows.length === 0
            ) {
                throw new Error(
                    'La billetera no existe para este usuario.'
                );
            }

            const saldoActual =
                Number(
                    walletResult.rows[0]
                        .saldo_disponible
                );

            if (saldoActual < numericMonto) {
                throw new Error(
                    `Saldo insuficiente. Disponible: $${saldoActual.toLocaleString(
                        'es-CO'
                    )} COP.`
                );
            }

            nuevoSaldo =
                (saldoActual - numericMonto)
                    .toFixed(2);
        }

        let cuotaTotal = 1;

        for (const linea of lineas) {
            cuotaTotal *=
                Number(
                    linea.valor_cuota_congelada
                );
        }

        if (
            !Number.isFinite(cuotaTotal) ||
            cuotaTotal <= 1
        ) {
            throw new Error(
                'No fue posible calcular una cuota combinada válida.'
            );
        }

        const posibleGanancia =
            (numericMonto * cuotaTotal)
                .toFixed(2);

        const codigoTicket =
            generateTicketCode();

        await client.query(
            `
            INSERT INTO ticket_apuesta (
                codigo_ticket,
                cedula_usuario,
                origen_fondos,
                monto_total,
                posible_ganancia_total,
                estado_ticket,
                nit_empresa
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'Pendiente',
                $6
            )
            `,
            [
                codigoTicket,
                cedula_usuario,
                origen_fondos,
                numericMonto,
                posibleGanancia,
                nit_empresa,
            ]
        );

        for (const linea of lineas) {
            await client.query(
                `
                INSERT INTO cuota_partido (
                    codigo_partido,
                    nombre_mercado,
                    multiplicador_fijado
                )
                VALUES ($1, $2, $3)
                ON CONFLICT (
                    codigo_partido,
                    nombre_mercado
                )
                DO UPDATE SET
                    multiplicador_fijado =
                        EXCLUDED.multiplicador_fijado
                `,
                [
                    linea.codigo_partido,
                    linea.nombre_mercado,
                    Number(
                        linea.valor_cuota_congelada
                    ),
                ]
            );

            await client.query(
                `
                INSERT INTO detalle_ticket (
                    codigo_ticket,
                    codigo_partido,
                    nombre_mercado,
                    valor_cuota_congelada
                )
                VALUES ($1, $2, $3, $4)
                `,
                [
                    codigoTicket,
                    linea.codigo_partido,
                    linea.nombre_mercado,
                    Number(
                        linea.valor_cuota_congelada
                    ),
                ]
            );
        }

        let referenciaPse = null;

        if (origen_fondos === 'Billetera') {
            await client.query(
                `
                UPDATE billetera
                SET
                    saldo_disponible = $1,
                    ultima_actualizacion =
                        CURRENT_TIMESTAMP
                WHERE cedula_usuario = $2
                `,
                [
                    nuevoSaldo,
                    cedula_usuario,
                ]
            );

            await client.query(
                `
                INSERT INTO tipo_transaccion (
                    nombre_tipo,
                    naturaleza_movimiento
                )
                VALUES (
                    'Apuesta Descontada',
                    'Egreso'
                )
                ON CONFLICT (nombre_tipo) DO NOTHING
                `
            );

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
                    'Apuesta Descontada',
                    $2,
                    $3
                )
                `,
                [
                    cedula_usuario,
                    numericMonto,
                    codigoTicket,
                ]
            );
        } else {
            referenciaPse =
                `PSE-TICKET-${randomUUID()
                    .replace(/-/g, '')
                    .slice(0, 16)
                    .toUpperCase()}`;

            await client.query(
                `
                INSERT INTO pago_pse_ticket (
                    codigo_referencia_pse,
                    codigo_ticket,
                    banco_origen
                )
                VALUES ($1, $2, $3)
                `,
                [
                    referenciaPse,
                    codigoTicket,
                    banco_origen,
                ]
            );
        }

        await client.query('COMMIT');

        await createAudit({
            cedula_usuario,
            req,
            estado_intento: 'Exitoso',
            tipo_evento: 'BET_CREATED',
            detalle: {
                codigo_ticket: codigoTicket,
                monto_total: numericMonto,
                posible_ganancia_total:
                    Number(posibleGanancia),
                origen_fondos,
                cantidad_lineas: lineas.length,
            },
        });

        return res.status(201).json({
            message:
                '¡Apuesta registrada exitosamente!',
            codigo_ticket: codigoTicket,
            origen_fondos,
            codigo_referencia_pse:
                referenciaPse,
            banco_origen:
                origen_fondos === 'PSE'
                    ? banco_origen
                    : null,
            monto_total: numericMonto,
            cuota_total:
                Number(cuotaTotal.toFixed(4)),
            posible_ganancia_total:
                Number(posibleGanancia),
            nuevo_saldo:
                nuevoSaldo !== null
                    ? Number(nuevoSaldo)
                    : null,
        });
    } catch (error) {
        await client.query('ROLLBACK');

        console.error(
            '[Betting Module] Error creando ticket:',
            error.message
        );

        return res.status(400).json({
            message:
                error.message ||
                'No se pudo procesar la apuesta.',
        });
    } finally {
        client.release();
    }
});


// ============================================================
// 4. LIQUIDAR APUESTA
// ============================================================

router.post(
    '/tickets/:codigo_ticket/settle',
    async (req, res) => {
        const { codigo_ticket } = req.params;

        const {
            resultado = 'Ganada',
        } = req.body;

        if (
            !['Ganada', 'Perdida'].includes(
                resultado
            )
        ) {
            return res.status(400).json({
                message:
                    'El resultado debe ser Ganada o Perdida.',
            });
        }

        const client =
            await pgPool.connect();

        try {
            await client.query('BEGIN');

            const ticketResult =
                await client.query(
                    `
                    SELECT *
                    FROM ticket_apuesta
                    WHERE codigo_ticket = $1
                    FOR UPDATE
                    `,
                    [codigo_ticket]
                );

            if (
                ticketResult.rows.length === 0
            ) {
                throw new Error(
                    `El ticket ${codigo_ticket} no existe.`
                );
            }

            const ticket =
                ticketResult.rows[0];

            if (
                ticket.estado_ticket !==
                'Pendiente'
            ) {
                throw new Error(
                    `El ticket ya fue liquidado como ${ticket.estado_ticket}.`
                );
            }

            await client.query(
                `
                UPDATE ticket_apuesta
                SET estado_ticket = $1
                WHERE codigo_ticket = $2
                `,
                [
                    resultado,
                    codigo_ticket,
                ]
            );

            let nuevoSaldo = null;

            if (resultado === 'Ganada') {
                await client.query(
                    `
                    INSERT INTO billetera (
                        cedula_usuario,
                        saldo_disponible
                    )
                    VALUES ($1, 0.00)
                    ON CONFLICT (
                        cedula_usuario
                    ) DO NOTHING
                    `,
                    [ticket.cedula_usuario]
                );

                const walletResult =
                    await client.query(
                        `
                        SELECT saldo_disponible
                        FROM billetera
                        WHERE cedula_usuario = $1
                        FOR UPDATE
                        `,
                        [ticket.cedula_usuario]
                    );

                const saldoActual =
                    Number(
                        walletResult.rows[0]
                            .saldo_disponible
                    );

                nuevoSaldo =
                    (
                        saldoActual +
                        Number(
                            ticket
                                .posible_ganancia_total
                        )
                    ).toFixed(2);

                await client.query(
                    `
                    UPDATE billetera
                    SET
                        saldo_disponible = $1,
                        ultima_actualizacion =
                            CURRENT_TIMESTAMP
                    WHERE cedula_usuario = $2
                    `,
                    [
                        nuevoSaldo,
                        ticket.cedula_usuario,
                    ]
                );

                await client.query(
                    `
                    INSERT INTO tipo_transaccion (
                        nombre_tipo,
                        naturaleza_movimiento
                    )
                    VALUES (
                        'Pago Premio',
                        'Ingreso'
                    )
                    ON CONFLICT (
                        nombre_tipo
                    ) DO NOTHING
                    `
                );

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
                        'Pago Premio',
                        $2,
                        $3
                    )
                    `,
                    [
                        ticket.cedula_usuario,
                        ticket
                            .posible_ganancia_total,
                        `PREMIO-${codigo_ticket}`,
                    ]
                );
            }

            await client.query('COMMIT');

            await createAudit({
                cedula_usuario:
                    ticket.cedula_usuario,
                req,
                estado_intento: resultado,
                tipo_evento: 'BET_SETTLED',
                detalle: {
                    codigo_ticket,
                    resultado,
                    premio:
                        resultado === 'Ganada'
                            ? Number(
                                ticket
                                    .posible_ganancia_total
                            )
                            : 0,
                },
            });

            return res.json({
                message:
                    `Ticket ${codigo_ticket} liquidado como ${resultado}.`,
                codigo_ticket,
                estado_ticket: resultado,
                nuevo_saldo:
                    nuevoSaldo !== null
                        ? Number(nuevoSaldo)
                        : undefined,
            });
        } catch (error) {
            await client.query('ROLLBACK');

            console.error(
                '[Betting Module] Error liquidando ticket:',
                error.message
            );

            return res.status(400).json({
                message:
                    error.message ||
                    'Error al liquidar el ticket.',
            });
        } finally {
            client.release();
        }
    }
);


// ============================================================
// 5. ANULAR APUESTA
// ============================================================

router.post(
    '/tickets/:codigo_ticket/cancel',
    async (req, res) => {
        const { codigo_ticket } = req.params;

        const client =
            await pgPool.connect();

        try {
            await client.query('BEGIN');

            const ticketResult =
                await client.query(
                    `
                    SELECT *
                    FROM ticket_apuesta
                    WHERE codigo_ticket = $1
                    FOR UPDATE
                    `,
                    [codigo_ticket]
                );

            if (
                ticketResult.rows.length === 0
            ) {
                throw new Error(
                    `El ticket ${codigo_ticket} no existe.`
                );
            }

            const ticket =
                ticketResult.rows[0];

            if (
                ticket.estado_ticket !==
                'Pendiente'
            ) {
                throw new Error(
                    'Solo se pueden anular tickets en estado Pendiente.'
                );
            }

            await client.query(
                `
                UPDATE ticket_apuesta
                SET estado_ticket = 'Anulada'
                WHERE codigo_ticket = $1
                `,
                [codigo_ticket]
            );

            await client.query(
                `
                INSERT INTO billetera (
                    cedula_usuario,
                    saldo_disponible
                )
                VALUES ($1, 0.00)
                ON CONFLICT (
                    cedula_usuario
                ) DO NOTHING
                `,
                [ticket.cedula_usuario]
            );

            const walletResult =
                await client.query(
                    `
                    SELECT saldo_disponible
                    FROM billetera
                    WHERE cedula_usuario = $1
                    FOR UPDATE
                    `,
                    [ticket.cedula_usuario]
                );

            const saldoActual =
                Number(
                    walletResult.rows[0]
                        .saldo_disponible
                );

            const nuevoSaldo =
                (
                    saldoActual +
                    Number(ticket.monto_total)
                ).toFixed(2);

            await client.query(
                `
                UPDATE billetera
                SET
                    saldo_disponible = $1,
                    ultima_actualizacion =
                        CURRENT_TIMESTAMP
                WHERE cedula_usuario = $2
                `,
                [
                    nuevoSaldo,
                    ticket.cedula_usuario,
                ]
            );

            await client.query(
                `
                INSERT INTO tipo_transaccion (
                    nombre_tipo,
                    naturaleza_movimiento
                )
                VALUES (
                    'Reembolso Apuesta',
                    'Ingreso'
                )
                ON CONFLICT (
                    nombre_tipo
                ) DO NOTHING
                `
            );

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
                    'Reembolso Apuesta',
                    $2,
                    $3
                )
                `,
                [
                    ticket.cedula_usuario,
                    ticket.monto_total,
                    `REEMBOLSO-${codigo_ticket}`,
                ]
            );

            await client.query('COMMIT');

            await createAudit({
                cedula_usuario:
                    ticket.cedula_usuario,
                req,
                estado_intento: 'Anulada',
                tipo_evento: 'BET_CANCELLED',
                detalle: {
                    codigo_ticket,
                    monto_reembolsado:
                        Number(ticket.monto_total),
                },
            });

            return res.json({
                message:
                    `Ticket ${codigo_ticket} anulado y reembolsado.`,
                codigo_ticket,
                estado_ticket: 'Anulada',
                monto_reembolsado:
                    Number(ticket.monto_total),
                nuevo_saldo:
                    Number(nuevoSaldo),
            });
        } catch (error) {
            await client.query('ROLLBACK');

            console.error(
                '[Betting Module] Error anulando ticket:',
                error.message
            );

            return res.status(400).json({
                message:
                    error.message ||
                    'Error al anular el ticket.',
            });
        } finally {
            client.release();
        }
    }
);


// ============================================================
// 6. HISTORIAL DE APUESTAS
// ============================================================

router.get('/tickets/:cedula', async (req, res) => {
    const { cedula } = req.params;

    try {
        const result = await pgPool.query(
            `
            SELECT
                t.*,
                COALESCE(
                    json_agg(d.*)
                    FILTER (
                        WHERE d.codigo_ticket
                        IS NOT NULL
                    ),
                    '[]'
                ) AS lineas
            FROM ticket_apuesta t
            LEFT JOIN detalle_ticket d
                ON t.codigo_ticket =
                   d.codigo_ticket
            WHERE t.cedula_usuario = $1
            GROUP BY t.codigo_ticket
            ORDER BY t.fecha_emision DESC
            `,
            [cedula]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error(
            '[Betting Module] Error obteniendo tickets:',
            error.message
        );

        return res.status(500).json({
            message:
                'Error consultando historial de tickets.',
        });
    }
});


module.exports = router;