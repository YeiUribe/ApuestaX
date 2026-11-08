const sql = require('mssql');
require('dotenv').config();

const requiredVariables = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
    console.warn(`[SQL Server] Faltan variables de entorno: ${missingVariables.join(', ')}`);
}

const port = Number(process.env.DB_PORT || 1433);
const [server, instanceFromServer] = (process.env.DB_SERVER || 'localhost').split('\\', 2);
const instanceName = process.env.DB_INSTANCE || instanceFromServer;

const config = {
    server,
    database: process.env.DB_NAME || 'Apuestas',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    connectionTimeout: 10000,
    requestTimeout: 15000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        ...(instanceName ? { instanceName } : {}),
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
};

if (!instanceName) {
    config.port = port;
}

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
        console.log(`[SQL Server] Conectado exitosamente a la base de datos "${config.database}"`);
        return pool;
    })
    .catch((err) => {
        console.error('[SQL Server] Error de conexión:', err.message);
        return null;
    });

module.exports = {
    sql,
    poolPromise,
};
