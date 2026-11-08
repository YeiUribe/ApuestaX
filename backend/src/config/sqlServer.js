const sql = require('mssql');
require('dotenv').config();

const requiredVariables = [
    'DB_SERVER',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
];

const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]
);

if (missingVariables.length > 0) {
    console.warn(
        `[SQL Server] Faltan variables de entorno: ${missingVariables.join(', ')}`
    );
}

const port = Number(process.env.DB_PORT || 1433);

const [server, instanceFromServer] = (
    process.env.DB_SERVER || 'localhost'
).split('\\', 2);

const instanceName =
    process.env.DB_INSTANCE || instanceFromServer;

const config = {
    server,
    database: process.env.DB_NAME || 'Apuestas',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    connectionTimeout: 30000,
    requestTimeout: 30000,

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },

    options: {
        ...(instanceName ? { instanceName } : {}),

        encrypt:
            process.env.DB_ENCRYPT === 'true',

        trustServerCertificate:
            process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
};

if (!instanceName) {
    config.port = port;
}

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(async (pool) => {

        const info = await pool
            .request()
            .query(`
                SELECT
                    @@SERVERNAME AS servidor,
                    DB_NAME() AS base_datos
            `);

        console.log(
            `[SQL Server] Servidor real: ${info.recordset[0].servidor}`
        );

        console.log(
            `[SQL Server] Base real: ${info.recordset[0].base_datos}`
        );

        console.log(
            `[SQL Server] Conectado exitosamente a la base de datos "${config.database}"`
        );

        // IMPORTANTE:
        // devolver el pool conectado para que server.js pueda usarlo
        return pool;
    })
    .catch((error) => {

        console.error(
            '[SQL Server] Error de conexión:',
            error.message
        );

        throw error;
    });

module.exports = {
    sql,
    poolPromise,
};