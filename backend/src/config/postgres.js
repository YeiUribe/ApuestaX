const { Pool } = require('pg');
require('dotenv').config();

// ============================================================
// CONFIGURACIÓN POSTGRESQL
// Compatible con PostgreSQL local y Azure PostgreSQL
// ============================================================

const useSSL = process.env.PG_SSL === 'true';

const pgConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'apuestas_cuentas',

    // Azure PostgreSQL requiere conexión cifrada.
    // Localmente puede mantenerse PG_SSL=false.
    ssl: useSSL
        ? {
            rejectUnauthorized: false,
        }
        : false,

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};


// ============================================================
// CREAR POOL
// ============================================================

const pgPool = new Pool(pgConfig);


// ============================================================
// MANEJO DE ERRORES DEL POOL
// ============================================================

pgPool.on('error', (error) => {
    console.error(
        '[PostgreSQL] Error inesperado en el pool:',
        error.message
    );
});


// ============================================================
// PRUEBA INICIAL DE CONEXIÓN
// ============================================================

pgPool.connect()
    .then(async (client) => {
        try {
            const result = await client.query(`
                SELECT
                    current_database() AS database_name,
                    current_user AS user_name,
                    version() AS version
            `);

            console.log(
                `[PostgreSQL] Conectado exitosamente a "${result.rows[0].database_name}"`
            );

            console.log(
                `[PostgreSQL] Usuario conectado: ${result.rows[0].user_name}`
            );

            console.log(
                `[PostgreSQL] SSL: ${useSSL ? 'habilitado' : 'deshabilitado'}`
            );

        } finally {
            client.release();
        }
    })
    .catch((error) => {
        console.error(
            '[PostgreSQL] Error de conexión:',
            error.message
        );
    });


module.exports = pgPool;