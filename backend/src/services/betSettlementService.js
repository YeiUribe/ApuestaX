const pgPool = require('../config/postgres');
const mysqlPool = require('../config/mysql');


// ============================================================
// EVALUAR UNA LÍNEA DE APUESTA
// ============================================================

function evaluarMercado(
    nombreMercado,
    marcadorLocal,
    marcadorVisitante,
    eventosPartido = []
) {
    const local = Number(marcadorLocal);
    const visitante = Number(marcadorVisitante);

    if (typeof nombreMercado === 'string' && nombreMercado.startsWith('Gol: ')) {
        const jugadorBuscado = nombreMercado.replace('Gol: ', '').trim().toLowerCase();
        return eventosPartido.some(
            (ev) =>
                ev.nombre_evento === 'Gol' &&
                String(ev.nombre_jugador || '').trim().toLowerCase() === jugadorBuscado
        );
    }

    if (typeof nombreMercado === 'string' && nombreMercado.startsWith('Tarjeta: ')) {
        const jugadorBuscado = nombreMercado.replace('Tarjeta: ', '').trim().toLowerCase();
        return eventosPartido.some(
            (ev) =>
                (ev.nombre_evento === 'Tarjeta Amarilla' || ev.nombre_evento === 'Tarjeta Roja') &&
                String(ev.nombre_jugador || '').trim().toLowerCase() === jugadorBuscado
        );
    }

    switch (nombreMercado) {

        case 'Gana Local':
            return local > visitante;

        case 'Gana Visitante':
            return visitante > local;

        case 'Empate':
            return local === visitante;

        case 'Ambos Marcan':
        case 'Ambos Equipos Anotan':
            return local > 0 && visitante > 0;

        case 'Más de 2.5 Goles':
            return local + visitante >= 3;

        case 'Menos de 2.5 Goles':
            return local + visitante <= 2;

        default:
            throw new Error(
                `Mercado no soportado: ${nombreMercado}`
            );
    }
}


// ============================================================
// LIQUIDAR TICKETS RELACIONADOS CON UN PARTIDO
// ============================================================

async function liquidarTicketsPorPartido(codigoPartido) {

    console.log(
        `[Settlement] Revisando apuestas del partido ${codigoPartido}`
    );

    // --------------------------------------------------------
    // 1. Buscar tickets pendientes relacionados
    // --------------------------------------------------------

    const ticketsResult = await pgPool.query(
        `
        SELECT DISTINCT
            t.codigo_ticket
        FROM ticket_apuesta t
        INNER JOIN detalle_ticket d
            ON d.codigo_ticket = t.codigo_ticket
        WHERE d.codigo_partido = $1
          AND t.estado_ticket = 'Pendiente'
        `,
        [codigoPartido]
    );


    if (ticketsResult.rows.length === 0) {
        console.log(
            `[Settlement] No existen tickets pendientes para ${codigoPartido}`
        );

        return {
            revisados: 0,
            ganados: 0,
            perdidos: 0,
            pendientes: 0,
        };
    }


    const resumen = {
        revisados: 0,
        ganados: 0,
        perdidos: 0,
        pendientes: 0,
    };


    // --------------------------------------------------------
    // 2. Revisar cada ticket
    // --------------------------------------------------------

    for (const ticketRow of ticketsResult.rows) {

        const codigoTicket =
            ticketRow.codigo_ticket;

        resumen.revisados++;


        // ----------------------------------------------------
        // Obtener todas las líneas del ticket
        // ----------------------------------------------------

        const lineasResult = await pgPool.query(
            `
            SELECT
                codigo_partido,
                nombre_mercado,
                valor_cuota_congelada
            FROM detalle_ticket
            WHERE codigo_ticket = $1
            `,
            [codigoTicket]
        );


        let todasFinalizadas = true;
        let algunaPerdida = false;


        // ----------------------------------------------------
        // 3. Evaluar cada partido del ticket
        // ----------------------------------------------------

        for (const linea of lineasResult.rows) {

            const [partidos] =
                await mysqlPool.query(
                    `
                    SELECT
                        codigo_partido,
                        marcador_local,
                        marcador_visitante,
                        estado_partido
                    FROM partido
                    WHERE codigo_partido = ?
                    `,
                    [linea.codigo_partido]
                );


            if (partidos.length === 0) {
                todasFinalizadas = false;
                continue;
            }


            const partido = partidos[0];


            // Si todavía no terminó, el ticket completo
            // no puede liquidarse.
            if (
                partido.estado_partido !==
                'Finalizado'
            ) {
                todasFinalizadas = false;
                continue;
            }

            const [eventosPartido] =
                await mysqlPool.query(
                    `
                    SELECT
                        ep.nombre_evento,
                        j.nombre_completo AS nombre_jugador
                    FROM evento_partido ep
                    INNER JOIN jugador j
                        ON ep.documento_jugador = j.documento_jugador
                    WHERE ep.codigo_partido = ?
                    `,
                    [linea.codigo_partido]
                );

            const acerto = evaluarMercado(
                linea.nombre_mercado,
                partido.marcador_local,
                partido.marcador_visitante,
                eventosPartido
            );


            if (!acerto) {
                algunaPerdida = true;
                break;
            }
        }


        // ----------------------------------------------------
        // Si falló cualquier selección, pierde inmediatamente
        // ----------------------------------------------------

        if (algunaPerdida) {

            const client =
                await pgPool.connect();

            try {
                await client.query('BEGIN');

                const lockedTicket =
                    await client.query(
                        `
                        SELECT estado_ticket
                        FROM ticket_apuesta
                        WHERE codigo_ticket = $1
                        FOR UPDATE
                        `,
                        [codigoTicket]
                    );


                if (
                    lockedTicket.rows.length === 0 ||
                    lockedTicket.rows[0]
                        .estado_ticket !== 'Pendiente'
                ) {
                    await client.query('ROLLBACK');
                    continue;
                }


                await client.query(
                    `
                    UPDATE ticket_apuesta
                    SET estado_ticket = 'Perdida'
                    WHERE codigo_ticket = $1
                    `,
                    [codigoTicket]
                );


                await client.query('COMMIT');

                resumen.perdidos++;

                console.log(
                    `[Settlement] ${codigoTicket} => Perdida`
                );

            } catch (error) {

                await client.query('ROLLBACK');

                console.error(
                    `[Settlement] Error liquidando ${codigoTicket}:`,
                    error.message
                );

            } finally {

                client.release();

            }

            continue;
        }


        // ----------------------------------------------------
        // Si falta algún partido, continúa Pendiente
        // ----------------------------------------------------

        if (!todasFinalizadas) {

            resumen.pendientes++;

            console.log(
                `[Settlement] ${codigoTicket} continúa Pendiente`
            );

            continue;
        }


        // ----------------------------------------------------
        // 4. TODAS LAS LÍNEAS ACERTARON
        // Pagar premio
        // ----------------------------------------------------

        const client =
            await pgPool.connect();

        try {

            await client.query('BEGIN');


            // Bloquear ticket
            const ticketResult =
                await client.query(
                    `
                    SELECT
                        codigo_ticket,
                        cedula_usuario,
                        posible_ganancia_total,
                        estado_ticket
                    FROM ticket_apuesta
                    WHERE codigo_ticket = $1
                    FOR UPDATE
                    `,
                    [codigoTicket]
                );


            if (
                ticketResult.rows.length === 0
            ) {
                await client.query('ROLLBACK');
                continue;
            }


            const ticket =
                ticketResult.rows[0];


            // Protección contra doble pago
            if (
                ticket.estado_ticket !==
                'Pendiente'
            ) {
                await client.query('ROLLBACK');
                continue;
            }


            // ------------------------------------------------
            // Crear billetera si fuera necesario
            // ------------------------------------------------

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


            // ------------------------------------------------
            // Bloquear billetera
            // ------------------------------------------------

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


            const premio =
                Number(
                    ticket.posible_ganancia_total
                );


            const nuevoSaldo =
                (saldoActual + premio)
                    .toFixed(2);


            // ------------------------------------------------
            // Marcar ticket GANADA
            // ------------------------------------------------

            await client.query(
                `
                UPDATE ticket_apuesta
                SET estado_ticket = 'Ganada'
                WHERE codigo_ticket = $1
                `,
                [codigoTicket]
            );


            // ------------------------------------------------
            // Actualizar saldo
            // ------------------------------------------------

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


            // ------------------------------------------------
            // Garantizar tipo de movimiento
            // ------------------------------------------------

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


            // ------------------------------------------------
            // Registrar premio
            // ------------------------------------------------

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
                    premio,
                    `PREMIO-${codigoTicket}`,
                ]
            );


            await client.query('COMMIT');


            resumen.ganados++;


            console.log(
                `[Settlement] ${codigoTicket} => Ganada | Premio: $${premio}`
            );

        } catch (error) {

            await client.query('ROLLBACK');

            console.error(
                `[Settlement] Error pagando ${codigoTicket}:`,
                error.message
            );

        } finally {

            client.release();

        }
    }


    return resumen;
}


module.exports = {
    evaluarMercado,
    liquidarTicketsPorPartido,
};