const { poolPromise: sqlServerPool, sql } = require('../config/sqlServer');
const mysqlPool = require('../config/mysql');
const pgPool = require('../config/postgres');
const mongoose = require('../config/mongo');
const { Regla, MercadoApuesta, LoginAudit } = require('../modules/rules/mongoSchemas');

/**
 * 1. IdentityRepository (SQL Server)
 */
const IdentityRepository = {
    async findUserByCedula(cedula) {
        const pool = await sqlServerPool;
        if (!pool) return null;
        const res = await pool
            .request()
            .input('cedula', sql.VarChar(20), cedula)
            .query('SELECT cedula, nombre_rol, nombre, apellido, correo, estado FROM usuario WHERE cedula = @cedula');
        return res.recordset[0] || null;
    },

    async findAllUsers() {
        const pool = await sqlServerPool;
        if (!pool) return [];
        const res = await pool.request().query(`
            SELECT u.cedula, u.nombre_rol, r.descripcion AS descripcion_rol, u.nombre, u.apellido, u.correo, u.estado
            FROM usuario u
            LEFT JOIN rol r ON u.nombre_rol = r.nombre_rol
            ORDER BY u.nombre, u.apellido
        `);
        return res.recordset;
    },
};

/**
 * 2. SportsRepository (MySQL - Liga BetPlay Dimayor)
 */
const SportsRepository = {
    async findMatchByCode(codigoPartido) {
        if (!mysqlPool) return null;
        const [rows] = await mysqlPool.query(
            'SELECT * FROM partido WHERE codigo_partido = ?',
            [codigoPartido]
        );
        return rows[0] || null;
    },

    async findAllMatches() {
        if (!mysqlPool) return [];
        const [rows] = await mysqlPool.query('SELECT * FROM partido ORDER BY fecha_hora ASC');
        return rows;
    },
};

/**
 * 3. WalletRepository (PostgreSQL - Operaciones con SELECT ... FOR UPDATE)
 */
const WalletRepository = {
    async getWalletByCedula(cedula) {
        const res = await pgPool.query(
            'SELECT cedula_usuario, saldo_disponible, ultima_actualizacion FROM billetera WHERE cedula_usuario = $1',
            [cedula]
        );
        return res.rows[0] || null;
    },

    async rechargeUsingFunction(cedula, monto, tipo = 'Recarga PSE') {
        const res = await pgPool.query('SELECT fn_recargar($1, $2, $3) AS nuevo_saldo', [
            cedula,
            monto,
            tipo,
        ]);
        return Number(res.rows[0].nuevo_saldo);
    },
};

/**
 * 4. BetRepository (PostgreSQL - Funciones PL/pgSQL y Transacciones ACID)
 */
const BetRepository = {
    async findTicketsByUser(cedula) {
        const res = await pgPool.query(
            `SELECT t.*, COALESCE(json_agg(d.*) FILTER (WHERE d.codigo_ticket IS NOT NULL), '[]') AS lineas
             FROM ticket_apuesta t
             LEFT JOIN detalle_ticket d ON t.codigo_ticket = d.codigo_ticket
             WHERE t.cedula_usuario = $1
             GROUP BY t.codigo_ticket
             ORDER BY t.fecha_emision DESC`,
            [cedula]
        );
        return res.rows;
    },

    async settleTicketUsingFunction(codigoTicket, resultado) {
        const res = await pgPool.query('SELECT fn_liquidar_apuesta($1, $2) AS nuevo_saldo', [
            codigoTicket,
            resultado,
        ]);
        return Number(res.rows[0].nuevo_saldo);
    },

    async cancelTicketUsingFunction(codigoTicket) {
        const res = await pgPool.query('SELECT fn_anular_apuesta($1) AS nuevo_saldo', [codigoTicket]);
        return Number(res.rows[0].nuevo_saldo);
    },
};

/**
 * 5. RulesRepository (MongoDB - Reglas y Mercados)
 */
const RulesRepository = {
    async getActiveRules() {
        if (mongoose.connection.readyState !== 1) return [];
        return Regla.find().lean();
    },

    async getActiveMarkets() {
        if (mongoose.connection.readyState !== 1) return [];
        return MercadoApuesta.find({ activo: true }).lean();
    },
};

/**
 * 6. AuditRepository (MongoDB - Logs y Agregaciones)
 */
const AuditRepository = {
    async logEvent(eventData) {
        if (mongoose.connection.readyState !== 1) return null;
        return LoginAudit.create(eventData);
    },

    async getRecentLogs(limit = 50) {
        if (mongoose.connection.readyState !== 1) return [];
        return LoginAudit.find().sort({ fecha_hora: -1 }).limit(limit).lean();
    },

    async getAggregatedStats() {
        if (mongoose.connection.readyState !== 1) return [];
        return LoginAudit.aggregate([
            {
                $group: {
                    _id: {
                        tipo_evento: { $ifNull: ['$tipo_evento', 'LOGIN'] },
                        estado_intento: '$estado_intento',
                    },
                    total: { $sum: 1 },
                    ultimo_registro: { $max: '$fecha_hora' },
                },
            },
            { $sort: { total: -1 } },
        ]);
    },
};

/**
 * 7. PaymentRepository (Pasarela Wompi / PSE en PostgreSQL)
 */
const PaymentRepository = {
    async recordPsePayment(referencia, codigoTicket, bancoOrigen) {
        await pgPool.query(
            `INSERT INTO pago_pse_ticket (codigo_referencia_pse, codigo_ticket, banco_origen)
             VALUES ($1, $2, $3)
             ON CONFLICT (codigo_referencia_pse) DO NOTHING`,
            [referencia, codigoTicket, bancoOrigen]
        );
    },
};

module.exports = {
    IdentityRepository,
    SportsRepository,
    WalletRepository,
    BetRepository,
    RulesRepository,
    AuditRepository,
    PaymentRepository,
};

