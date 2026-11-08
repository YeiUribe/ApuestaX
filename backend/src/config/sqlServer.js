const sql = require('mssql');
require('dotenv').config();

const requiredVariables = [
    'DB_SERVER',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
];

const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]
);

if (missingVariables.length > 0) {
    console.warn(
        `[SQL Server] Faltan variables de entorno: ${missingVariables.join(', ')}`
    );
}

const config = {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),

    database: process.env.DB_NAME,

    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    connectionTimeout: 60000,
    requestTimeout: 60000,

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },

    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

console.log('[SQL Server] Configuración:');
console.log(`Servidor: ${config.server}`);
console.log(`Puerto: ${config.port}`);
console.log(`Base: ${config.database}`);
console.log(`Usuario: ${config.user}`);
console.log('Encrypt: true');
console.log('TrustServerCertificate: false');

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

        return pool;
    })
    .catch((error) => {

        console.error(
            '[SQL Server] Error de conexión:',
            error.message
        );

        if (error.code) {
            console.error(
                '[SQL Server] Código:',
                error.code
            );
        }

        if (error.originalError) {
            console.error(
                '[SQL Server] Error original:',
                error.originalError.message
            );
        }

        throw error;
    });

module.exports = {
    sql,
    poolPromise
};