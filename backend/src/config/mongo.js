const mongoose = require('mongoose');
require('dotenv').config();
const {
    Regla,
    MercadoApuesta,
    LoginAudit,
    defaultReglas,
    defaultMercados,
    defaultLoginAudits,
} = require('../modules/rules/mongoSchemas');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/apuestas_logs';

const seedMongoDefaults = async () => {
    try {
        for (const regla of defaultReglas) {
            await Regla.updateOne(
                { codigo_regla: regla.codigo_regla },
                { $setOnInsert: regla },
                { upsert: true }
            );
        }
        for (const mercado of defaultMercados) {
            await MercadoApuesta.updateOne(
                { nombre_mercado: mercado.nombre_mercado },
                { $setOnInsert: mercado },
                { upsert: true }
            );
        }
        const auditCount = await LoginAudit.countDocuments();
        if (auditCount === 0) {
            await LoginAudit.insertMany(defaultLoginAudits);
        }
    } catch (seedErr) {
        console.warn('[MongoDB] Aviso al inicializar datos semilla:', seedErr.message);
    }
};

const connectMongo = async () => {
    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 4000,
        });
        console.log('[MongoDB] Conectado exitosamente a MongoDB Atlas');
        await seedMongoDefaults();
    } catch (err) {
        console.warn(`[MongoDB] Aviso de conexión: ${err.message}. (Usando datos de respaldo en memoria)`);
    }
};

connectMongo();

module.exports = mongoose;
