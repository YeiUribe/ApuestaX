const mongoose = require('mongoose');

// 1. Esquema de Reglas (Colección: reglas)
const ReglaSchema = new mongoose.Schema({
    codigo_regla: { type: String, required: true, unique: true, index: true },
    descripcion_regla: { type: String, required: true },
    valor_numerico: { type: Number, required: true },
    nit_empresa: { type: String, default: '900123456-1' },
    fecha_creacion: { type: Date, default: Date.now },
});

// 2. Esquema de Mercado de Apuesta (Colección: mercado_apuesta)
const MercadoApuestaSchema = new mongoose.Schema({
    nombre_mercado: { type: String, required: true, unique: true, index: true },
    descripcion: { type: String, default: null },
    activo: { type: Boolean, default: true },
});

// 3. Esquema de Auditoría (Colección: login_audit)
// Soporta tanto auditoría de login como eventos del sistema (BET_CREATED, BET_SETTLED, LOGIN_SUCCESS, LOGIN_FAILED)
const LoginAuditSchema = new mongoose.Schema({
    cedula_usuario: { type: String, required: true, index: true },
    fecha_hora: { type: Date, default: Date.now, index: true },
    ip_conexion: { type: String, default: '127.0.0.1' },
    estado_intento: { type: String, required: true }, // 'Exitoso', 'Fallido', 'BET_CREATED', 'BET_SETTLED'
    tipo_evento: { type: String, default: 'LOGIN' },
    detalle: { type: mongoose.Schema.Types.Mixed, default: null },
});

const Regla = mongoose.models.Regla || mongoose.model('Regla', ReglaSchema, 'reglas');
const MercadoApuesta = mongoose.models.MercadoApuesta || mongoose.model('MercadoApuesta', MercadoApuestaSchema, 'mercado_apuesta');
const LoginAudit = mongoose.models.LoginAudit || mongoose.model('LoginAudit', LoginAuditSchema, 'login_audit');

const defaultReglas = [
    { codigo_regla: 'MIN_RECARGA', descripcion_regla: 'Valor mínimo permitido para recargar la billetera', valor_numerico: 10000.00, nit_empresa: '900123456-1' },
    { codigo_regla: 'MIN_RETIRO', descripcion_regla: 'Monto mínimo para solicitar transferencia bancaria', valor_numerico: 20000.00, nit_empresa: '900123456-1' },
    { codigo_regla: 'MAX_APUESTA', descripcion_regla: 'Tope máximo de dinero por ticket de apuesta', valor_numerico: 5000000.00, nit_empresa: '900123456-1' },
    { codigo_regla: 'MAX_RETIRO_DIA', descripcion_regla: 'Límite máximo de retiros en un periodo de 24 horas', valor_numerico: 10000000.00, nit_empresa: '900123456-1' },
    { codigo_regla: 'EDAD_MINIMA', descripcion_regla: 'Edad legal requerida para apostar en la plataforma', valor_numerico: 18.00, nit_empresa: '900123456-1' },
];

const defaultMercados = [
    { nombre_mercado: 'Gana Local', descripcion: 'El equipo local gana el partido' },
    { nombre_mercado: 'Empate', descripcion: 'El partido termina en empate al final del tiempo regular' },
    { nombre_mercado: 'Gana Visitante', descripcion: 'El equipo visitante gana el partido' },
    { nombre_mercado: 'Más de 2.5 Goles', descripcion: 'Se anotan 3 o más goles en total' },
    { nombre_mercado: 'Menos de 2.5 Goles', descripcion: 'Se anotan 2 o menos goles en total' },
    { nombre_mercado: 'Ambos Marcan', descripcion: 'Ambos equipos anotan al menos un gol' },
];

const defaultLoginAudits = [
    { cedula_usuario: '1000000001', fecha_hora: new Date('2026-09-02T08:00:00'), ip_conexion: '192.168.1.10', estado_intento: 'Exitoso', tipo_evento: 'LOGIN_SUCCESS' },
    { cedula_usuario: '1000000002', fecha_hora: new Date('2026-09-02T08:15:00'), ip_conexion: '192.168.1.11', estado_intento: 'Exitoso', tipo_evento: 'LOGIN_SUCCESS' },
    { cedula_usuario: '1035000001', fecha_hora: new Date('2026-09-02T09:00:00'), ip_conexion: '186.155.10.5', estado_intento: 'Exitoso', tipo_evento: 'LOGIN_SUCCESS' },
    { cedula_usuario: '1035000002', fecha_hora: new Date('2026-09-02T09:30:00'), ip_conexion: '190.24.55.12', estado_intento: 'Fallido', tipo_evento: 'LOGIN_FAILED' },
    { cedula_usuario: '1035000002', fecha_hora: new Date('2026-09-02T09:35:00'), ip_conexion: '190.24.55.12', estado_intento: 'Exitoso', tipo_evento: 'LOGIN_SUCCESS' },
];

module.exports = {
    Regla,
    MercadoApuesta,
    LoginAudit,
    defaultReglas,
    defaultMercados,
    defaultLoginAudits,
};
