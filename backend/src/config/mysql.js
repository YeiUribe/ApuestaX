const mysql = require('mysql2/promise');
require('dotenv').config();

const mysqlConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'apuestas_deportes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

let mysqlPool = null;

try {
    mysqlPool = mysql.createPool(mysqlConfig);
    // Verificación inicial no bloqueante
    mysqlPool.getConnection()
        .then((conn) => {
            console.log(`[MySQL] Conectado exitosamente a "${mysqlConfig.database}"`);
            conn.release();
        })
        .catch((err) => {
            console.warn(`[MySQL] Aviso de conexión: ${err.message}. Verifica las credenciales en .env`);
        });
} catch (error) {
    console.error('[MySQL] Error al inicializar pool:', error.message);
}

module.exports = mysqlPool;
