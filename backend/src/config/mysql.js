const mysql = require('mysql2/promise');
require('dotenv').config();

const useSSL =
    process.env.MYSQL_SSL === 'true';

const mysqlConfig = {
    host:
        process.env.MYSQL_HOST ||
        'localhost',

    port:
        Number(
            process.env.MYSQL_PORT ||
            3306
        ),

    user:
        process.env.MYSQL_USER ||
        'root',

    password:
        process.env.MYSQL_PASSWORD ||
        '',

    database:
        process.env.MYSQL_DATABASE ||
        'apuestas_deportes',

    ssl: useSSL
        ? {
            rejectUnauthorized: false,
        }
        : undefined,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    connectTimeout: 10000,
};


let mysqlPool = null;


try {
    mysqlPool =
        mysql.createPool(mysqlConfig);


    mysqlPool
        .getConnection()

        .then(async (connection) => {

            const [rows] =
                await connection.query(`
                    SELECT
                        DATABASE() AS database_name,
                        CURRENT_USER() AS user_name,
                        VERSION() AS version
                `);


            console.log(
                `[MySQL] Conectado exitosamente a "${rows[0].database_name}"`
            );

            console.log(
                `[MySQL] Usuario conectado: ${rows[0].user_name}`
            );

            console.log(
                `[MySQL] SSL: ${useSSL
                    ? 'habilitado'
                    : 'deshabilitado'
                }`
            );


            connection.release();
        })

        .catch((error) => {

            console.error(
                '[MySQL] Error de conexión:',
                error.message
            );

        });

} catch (error) {

    console.error(
        '[MySQL] Error al inicializar pool:',
        error.message
    );

}


module.exports = mysqlPool;