const { Pool } = require('pg');
require('dotenv').config();

const pgConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'apuestas_cuentas',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

const pgPool = new Pool(pgConfig);

pgPool.connect()
    .then((client) => {
        console.log(`[PostgreSQL] Conectado exitosamente a "${pgConfig.database}"`);
        client.release();
    })
    .catch((err) => {
        console.warn(`[PostgreSQL] Aviso de conexión: ${err.message}. Verifica las credenciales en .env`);
    });

module.exports = pgPool;
