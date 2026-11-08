const express = require('express');
const router = express.Router();
const mongoose = require('../../config/mongo');
const {
    Regla,
    MercadoApuesta,
    LoginAudit,
    defaultReglas,
    defaultMercados,
    defaultLoginAudits,
} = require('./mongoSchemas');
const { AuditService } = require('../../services');

// 1. Obtener reglas de la plataforma
router.get('/', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json(defaultReglas);
        }
        const reglas = await Regla.find();
        res.json(reglas.length > 0 ? reglas : defaultReglas);
    } catch (error) {
        console.error('[Rules Module] Error consultando reglas:', error.message);
        res.status(500).json({ message: 'Error consultando reglas.', error: error.message });
    }
});

// 2. Obtener mercados disponibles
router.get('/markets', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json(defaultMercados);
        }
        const mercados = await MercadoApuesta.find();
        res.json(mercados.length > 0 ? mercados : defaultMercados);
    } catch (error) {
        console.error('[Rules Module] Error consultando mercados:', error.message);
        res.status(500).json({ message: 'Error consultando mercados.', error: error.message });
    }
});

// 3. Auditoría de accesos y eventos (Logs)
router.get('/logs', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json(defaultLoginAudits);
        }
        const logs = await LoginAudit.find().sort({ fecha_hora: -1 }).limit(50);
        res.json(logs);
    } catch (error) {
        console.error('[Rules Module] Error consultando logs:', error.message);
        res.status(500).json({ message: 'Error consultando logs.', error: error.message });
    }
});

// 4. Estadísticas Agregadas de Auditoría en MongoDB ($group, $sum, $sort)
router.get('/stats', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json([
                { _id: { tipo_evento: 'LOGIN_SUCCESS', estado_intento: 'Exitoso' }, total: 4 },
                { _id: { tipo_evento: 'LOGIN_FAILED', estado_intento: 'Fallido' }, total: 1 },
            ]);
        }
        const stats = await AuditService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('[Rules Module] Error en agregación MongoDB:', error.message);
        res.status(500).json({ message: 'Error en agregación de auditoría.', error: error.message });
    }
});

module.exports = router;
