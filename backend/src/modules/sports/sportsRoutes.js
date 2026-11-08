const express = require('express');
const router = express.Router();
const mysqlPool = require('../../config/mysql');

const {
    liquidarTicketsPorPartido,
} = require('../../services/betSettlementService');

// 1. Obtener todas las ligas / torneos
router.get('/leagues', async (req, res) => {
    try {
        if (!mysqlPool) {
            return res.status(503).json({ message: 'Conexión a MySQL no disponible.' });
        }
        const [rows] = await mysqlPool.query('SELECT codigo_torneo, nombre_torneo, año FROM torneo');
        res.json(rows);
    } catch (error) {
        console.error('[Sports Module] Error al obtener torneos:', error.message);
        res.status(500).json({ message: 'Error consultando torneos deportivos.', error: error.message });
    }
});

// 2. Obtener equipos
router.get('/teams', async (req, res) => {
    try {
        if (!mysqlPool) {
            return res.status(503).json({ message: 'Conexión a MySQL no disponible.' });
        }
        const [rows] = await mysqlPool.query(`
            SELECT 
                e.nombre_equipo, 
                e.nombre_estadio, 
                e.fecha_fundacion,
                est.ciudad,
                est.capacidad
            FROM equipo e
            LEFT JOIN estadio est ON e.nombre_estadio = est.nombre_estadio
            ORDER BY e.nombre_equipo
        `);
        res.json(rows);
    } catch (error) {
        console.error('[Sports Module] Error al obtener equipos:', error.message);
        res.status(500).json({ message: 'Error consultando equipos.', error: error.message });
    }
});

// 2.1 Obtener todos los jugadores actuales de la Liga BetPlay
router.get('/players', async (req, res) => {
    try {
        if (!mysqlPool) {
            return res.status(503).json({ message: 'Conexión a MySQL no disponible.' });
        }
        const [rows] = await mysqlPool.query(`
            SELECT
                j.documento_jugador,
                j.nombre_equipo,
                j.nombre_completo,
                j.posicion_habitual,
                dt.nombre_completo AS director_tecnico
            FROM jugador j
            LEFT JOIN director_tecnico dt ON j.nombre_equipo = dt.nombre_equipo
            ORDER BY j.nombre_equipo, FIELD(j.posicion_habitual, 'Delantero', 'Volante', 'Defensa', 'Portero'), j.nombre_completo
        `);
        res.json(rows);
    } catch (error) {
        console.error('[Sports Module] Error al obtener jugadores:', error.message);
        res.status(500).json({ message: 'Error consultando jugadores.', error: error.message });
    }
});

// 3. Obtener partidos con información enriquecida (Jornada, Torneo, Estadio y Árbitro)
router.get('/matches', async (req, res) => {
    try {
        if (!mysqlPool) {
            return res.status(503).json({ message: 'Conexión a MySQL no disponible.' });
        }
        const [rows] = await mysqlPool.query(`
            SELECT 
                p.codigo_partido,
                p.codigo_jornada,
                j.nombre_jornada,
                j.codigo_torneo,
                t.nombre_torneo,
                p.equipo_local,
                p.equipo_visitante,
                el.nombre_estadio,
                est.ciudad,
                p.fecha_hora,
                p.marcador_local,
                p.marcador_visitante,
                p.estado_partido,
                p.documento_arbitro,
                a.nombre_completo AS arbitro,
                dt_local.nombre_completo AS dt_local,
                dt_vis.nombre_completo AS dt_visitante
            FROM partido p
            LEFT JOIN jornada j ON p.codigo_jornada = j.codigo_jornada
            LEFT JOIN torneo t ON j.codigo_torneo = t.codigo_torneo
            LEFT JOIN equipo el ON p.equipo_local = el.nombre_equipo
            LEFT JOIN estadio est ON el.nombre_estadio = est.nombre_estadio
            LEFT JOIN arbitro a ON p.documento_arbitro = a.documento_arbitro
            LEFT JOIN director_tecnico dt_local ON p.equipo_local = dt_local.nombre_equipo
            LEFT JOIN director_tecnico dt_vis ON p.equipo_visitante = dt_vis.nombre_equipo
            ORDER BY p.fecha_hora ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('[Sports Module] Error al obtener partidos:', error.message);
        res.status(500).json({ message: 'Error consultando partidos.', error: error.message });
    }
});

// 4. Obtener detalles en vivo de un partido (Eventos y Alineaciones)
router.get('/matches/:codigo_partido/details', async (req, res) => {
    const { codigo_partido } = req.params;
    try {
        if (!mysqlPool) {
            return res.status(503).json({ message: 'Conexión a MySQL no disponible.' });
        }

        const [eventos] = await mysqlPool.query(`
            SELECT 
                ep.codigo_partido,
                ep.minuto_ocurrencia,
                ep.documento_jugador,
                j.nombre_completo AS nombre_jugador,
                j.nombre_equipo,
                ep.nombre_evento,
                te.descripcion AS descripcion_evento
            FROM evento_partido ep
            LEFT JOIN jugador j ON ep.documento_jugador = j.documento_jugador
            LEFT JOIN tipo_evento te ON ep.nombre_evento = te.nombre_evento
            WHERE ep.codigo_partido = ?
            ORDER BY ep.minuto_ocurrencia ASC
        `, [codigo_partido]);

        const [alineaciones] = await mysqlPool.query(`
            SELECT 
                al.codigo_partido,
                al.documento_jugador,
                CAST(al.es_titular AS UNSIGNED) AS es_titular,
                j.nombre_completo AS nombre_jugador,
                j.nombre_equipo,
                j.posicion_habitual
            FROM alineacion al
            INNER JOIN jugador j ON al.documento_jugador = j.documento_jugador
            WHERE al.codigo_partido = ?
            ORDER BY j.nombre_equipo, al.es_titular DESC
        `, [codigo_partido]);

        res.json({ eventos, alineaciones });
    } catch (error) {
        console.error('[Sports Module] Error al obtener detalles del partido:', error.message);
        res.status(500).json({ message: 'Error consultando detalles del partido.', error: error.message });
    }
});

// 5. Actualizar marcador o estado de un partido en vivo
router.put('/matches/:codigo_partido/live', async (req, res) => {

    const { codigo_partido } = req.params;

    const {
        marcador_local,
        marcador_visitante,
        estado_partido,
        documento_jugador,
        nombre_evento = 'Gol',
        minuto_ocurrencia,
    } = req.body;

    try {
        if (!mysqlPool) {
            return res.status(503).json({
                message: 'Conexión a MySQL no disponible.',
            });
        }

        // Consultar estado previo del partido para detectar si se anotó un gol
        const [prevRows] = await mysqlPool.query(
            `SELECT equipo_local, equipo_visitante, marcador_local, marcador_visitante FROM partido WHERE codigo_partido = ?`,
            [codigo_partido]
        );
        const prevPartido = prevRows[0] || null;

        // ----------------------------------------------------
        // Actualizar partido en MySQL
        // ----------------------------------------------------

        await mysqlPool.query(
            `
            UPDATE partido
            SET
                marcador_local = COALESCE(?, marcador_local),
                marcador_visitante = COALESCE(?, marcador_visitante),
                estado_partido = COALESCE(?, estado_partido)
            WHERE codigo_partido = ?
            `,
            [
                marcador_local,
                marcador_visitante,
                estado_partido,
                codigo_partido,
            ]
        );

        // Si se especificó un jugador o subió el marcador, registrar el evento en evento_partido
        if (prevPartido) {
            const minEvento = minuto_ocurrencia || Math.floor(Math.random() * 40) + 50;
            if (documento_jugador) {
                await mysqlPool.query(
                    `INSERT IGNORE INTO evento_partido (codigo_partido, minuto_ocurrencia, documento_jugador, nombre_evento) VALUES (?, ?, ?, ?)`,
                    [codigo_partido, minEvento, documento_jugador, nombre_evento]
                );
            } else {
                const subioLocal = marcador_local !== undefined && Number(marcador_local) > Number(prevPartido.marcador_local);
                const subioVis = marcador_visitante !== undefined && Number(marcador_visitante) > Number(prevPartido.marcador_visitante);
                const equipoAnotador = subioLocal ? prevPartido.equipo_local : subioVis ? prevPartido.equipo_visitante : null;

                if (equipoAnotador) {
                    const [atacantes] = await mysqlPool.query(
                        `SELECT documento_jugador FROM jugador WHERE nombre_equipo = ? ORDER BY FIELD(posicion_habitual, 'Delantero', 'Volante', 'Defensa', 'Portero') LIMIT 2`,
                        [equipoAnotador]
                    );
                    if (atacantes.length > 0) {
                        const elegido = atacantes[Math.floor(Math.random() * atacantes.length)];
                        await mysqlPool.query(
                            `INSERT IGNORE INTO evento_partido (codigo_partido, minuto_ocurrencia, documento_jugador, nombre_evento) VALUES (?, ?, ?, 'Gol')`,
                            [codigo_partido, minEvento, elegido.documento_jugador]
                        );
                    }
                }
            }
        }


        // ----------------------------------------------------
        // Consultar partido ya actualizado
        // ----------------------------------------------------

        const [partidos] = await mysqlPool.query(
            `
            SELECT
                codigo_partido,
                equipo_local,
                equipo_visitante,
                marcador_local,
                marcador_visitante,
                estado_partido
            FROM partido
            WHERE codigo_partido = ?
            `,
            [codigo_partido]
        );


        if (partidos.length === 0) {
            return res.status(404).json({
                message: `El partido ${codigo_partido} no existe.`,
            });
        }


        const partidoActualizado = partidos[0];

        let liquidacion = null;


        // ----------------------------------------------------
        // Si el partido terminó, liquidar apuestas
        // ----------------------------------------------------

        if (
            partidoActualizado.estado_partido ===
            'Finalizado'
        ) {

            console.log(
                `[Sports] Partido ${codigo_partido} finalizado. Iniciando liquidación de apuestas...`
            );

            liquidacion =
                await liquidarTicketsPorPartido(
                    codigo_partido
                );

            console.log(
                `[Sports] Liquidación terminada para ${codigo_partido}:`,
                liquidacion
            );
        }


        return res.json({
            message:
                `Partido ${codigo_partido} actualizado correctamente.`,

            partido: partidoActualizado,

            liquidacion,
        });

    } catch (error) {

        console.error(
            '[Sports Module] Error actualizando partido:',
            error.message
        );

        return res.status(500).json({
            message:
                'No se pudo actualizar el partido.',

            error:
                error.message,
        });
    }
});

// 6. Activar / Simular Transmisión en Vivo en MySQL para los partidos de la jornada
router.post('/matches/simulate-live', async (req, res) => {
    try {
        if (!mysqlPool) {
            return res.status(503).json({ message: 'Conexión a MySQL no disponible.' });
        }

        // Poner partidos programados en estado 'En Vivo' o actualizar marcador
        await mysqlPool.query(`
            UPDATE partido
            SET estado_partido = 'En Vivo'
            WHERE codigo_partido IN ('ONC-NAL-F2', 'MIL-AME-F2', 'JUN-ONC-F3')
        `);

        const [rows] = await mysqlPool.query('SELECT * FROM partido ORDER BY fecha_hora ASC');
        res.json({
            message: 'Transmisión en vivo sincronizada con MySQL.',
            partidos: rows,
        });
    } catch (error) {
        console.error('[Sports Module] Error en simulación en vivo:', error.message);
        res.status(500).json({ message: 'Error al activar partidos en vivo.', error: error.message });
    }
});

module.exports = router;
