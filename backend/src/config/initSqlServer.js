const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const port = Number(process.env.DB_PORT || 1433);
const [server, instanceFromServer] = (process.env.DB_SERVER || 'localhost').split('\\', 2);
const instanceName = process.env.DB_INSTANCE || instanceFromServer;

const masterConfig = {
    server,
    database: 'master',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    options: {
        ...(instanceName ? { instanceName } : {}),
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
};

if (!instanceName) {
    masterConfig.port = port;
}

async function runSqlServerScript() {
    const sqlFilePath = path.resolve(__dirname, '../../../../database/sqlserver_identidad.sql');
    console.log(`[SQL Server Init] Leyendo script: ${sqlFilePath}`);
    const scriptContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Separar por bloques GO
    const batches = scriptContent
        .split(/^\s*GO\s*$/im)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

    let pool;
    try {
        console.log(`[SQL Server Init] Conectando a ${server}${instanceName ? '\\' + instanceName : ''}...`);
        pool = await new sql.ConnectionPool(masterConfig).connect();

        for (const batch of batches) {
            await pool.request().query(batch);
        }

        console.log('✅ [SQL Server Init] Base de datos "Apuestas", tablas e inserts creados exitosamente.');
    } catch (error) {
        console.error('❌ [SQL Server Init] Error al ejecutar el script:', error.message);
        process.exitCode = 1;
    } finally {
        if (pool) await pool.close();
    }
}

runSqlServerScript();

