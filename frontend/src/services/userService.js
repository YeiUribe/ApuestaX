import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api/';

const apiClient = axios.create({
    baseURL: API_URL,
});

// Interceptor para enviar automáticamente el JWT en cada petición
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('apuestax_jwt');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// =====================================================================
// 1. IDENTIDAD, ROLES, EMPRESAS Y USUARIOS (SQL Server + JWT)
// =====================================================================
export const getUsers = async () => {
    const response = await apiClient.get('users');
    return response.data;
};

export const getRoles = async () => {
    const response = await apiClient.get('roles');
    return response.data;
};

export const getEmpresas = async () => {
    const response = await apiClient.get('empresas');
    return response.data;
};

export const login = async (credentials) => {
    const response = await apiClient.post('auth/login', credentials);
    if (response.data?.token) {
        localStorage.setItem('apuestax_jwt', response.data.token);
    }
    const userPayload = response.data?.user || response.data;
    if (userPayload?.cedula) {
        localStorage.setItem('apuestax_user', JSON.stringify(userPayload));
    }
    return response.data;
};

export const logoutSession = () => {
    localStorage.removeItem('apuestax_jwt');
    localStorage.removeItem('apuestax_user');
    localStorage.removeItem('apuestax_view');
    localStorage.removeItem('apuestax_wallet_section');
};

export const register = async (user) => {
    const response = await apiClient.post('auth/register', user);
    return response.data;
};

export const updateUser = async (cedula, userData) => {
    const response = await apiClient.put(`users/${cedula}`, userData);
    return response.data;
};

export const deleteUser = async (cedula) => {
    const response = await apiClient.delete(`users/${cedula}`);
    return response.data;
};

// =====================================================================
// 2. DASHBOARD UNIFICADO MULTIBASE
// =====================================================================
export const getDashboard = async (cedula) => {
    const response = await apiClient.get(`dashboard/${cedula}`);
    return response.data;
};

// =====================================================================
// 3. DEPORTES Y PARTIDOS (MySQL - Liga BetPlay Dimayor)
// =====================================================================
export const getLeagues = async () => {
    const response = await apiClient.get('sports/leagues');
    return response.data;
};

export const getTeams = async () => {
    const response = await apiClient.get('sports/teams');
    return response.data;
};

export const getPlayers = async () => {
    const response = await apiClient.get('sports/players');
    return response.data;
};

export const getMatches = async () => {
    const response = await apiClient.get('sports/matches');
    return response.data;
};

export const getMatchDetails = async (codigoPartido) => {
    const response = await apiClient.get(`sports/matches/${codigoPartido}/details`);
    return response.data;
};

export const updateLiveMatch = async (codigoPartido, payload) => {
    const response = await apiClient.put(`sports/matches/${codigoPartido}/live`, payload);
    return response.data;
};

export const simulateLiveMatches = async () => {
    const response = await apiClient.post('sports/matches/simulate-live');
    return response.data;
};

// =====================================================================
// 4. BILLETERA, CUOTAS Y APUESTAS (PostgreSQL + Funciones Atómicas)
// =====================================================================
export const getWallet = async (cedula) => {
    const response = await apiClient.get(`betting/wallet/${cedula}`);
    return response.data;
};

/**
 * Calcula de forma determinista Saldo Total, Saldo Real y Bono Activo
 * exclusivamente a partir de la respuesta real de PostgreSQL (`getWallet`).
 */
export const calcularDesgloseBilletera = (walletData) => {
    const totalDisponible = Number(walletData?.saldo_disponible) || 0;
    const movimientos = Array.isArray(walletData?.movimientos)
        ? walletData.movimientos
        : [];

    const cronologicos = [...movimientos].sort(
        (a, b) =>
            new Date(a.fecha_hora).getTime() -
            new Date(b.fecha_hora).getTime()
    );

    let bonoAcumulado = 0;
    let realAcumulado = 0;

    for (const mov of cronologicos) {
        const monto = Number(mov.monto) || 0;
        if (monto <= 0) continue;

        const tipo = String(mov.nombre_tipo || '');
        const esBono = tipo.toLowerCase().includes('bono');
        const esEgreso =
            mov.naturaleza_movimiento === 'Egreso' ||
            ['Apuesta Descontada', 'Retiro Bancario'].includes(tipo);

        if (esEgreso) {
            if (tipo === 'Retiro Bancario') {
                const descReal = Math.min(realAcumulado, monto);
                realAcumulado -= descReal;
                bonoAcumulado = Math.max(0, bonoAcumulado - (monto - descReal));
            } else {
                const descBono = Math.min(bonoAcumulado, monto);
                bonoAcumulado -= descBono;
                realAcumulado = Math.max(0, realAcumulado - (monto - descBono));
            }
        } else if (esBono) {
            bonoAcumulado += monto;
        } else {
            realAcumulado += monto;
        }
    }

    const bonoActivo = Math.max(0, Math.min(totalDisponible, bonoAcumulado));
    const saldoReal = Math.max(0, totalDisponible - bonoActivo);

    return {
        saldoTotal: totalDisponible,
        saldoReal,
        bonoActivo,
        movimientos,
    };
};

export const rechargeWallet = async (payload) => {
    const response = await apiClient.post('betting/wallet/recharge', payload);
    return response.data;
};

export const withdrawWallet = async (payload) => {
    const response = await apiClient.post('betting/wallet/withdraw', payload);
    return response.data;
};

export const preparePayment = async (payload) => {
    const response = await apiClient.post('payments/prepare', payload);
    return response.data;
};

export const confirmPaymentWebhook = async (payload) => {
    const response = await apiClient.post('payments/webhook', payload);
    return response.data;
};

export const getAllOdds = async () => {
    const response = await apiClient.get('betting/odds');
    return response.data;
};

export const getMatchOdds = async (codigoPartido) => {
    const response = await apiClient.get(`betting/odds/${codigoPartido}`);
    return response.data;
};

export const createTicket = async (ticketPayload) => {
    const response = await apiClient.post('betting/tickets', ticketPayload);
    return response.data;
};

export const getUserTickets = async (cedula) => {
    const response = await apiClient.get(`betting/tickets/${cedula}`);
    return response.data;
};

export const settleTicket = async (codigoTicket, resultado) => {
    const response = await apiClient.post(`betting/tickets/${codigoTicket}/settle`, { resultado });
    return response.data;
};

export const cancelTicket = async (codigoTicket) => {
    const response = await apiClient.post(`betting/tickets/${codigoTicket}/cancel`);
    return response.data;
};

// =====================================================================
// 5. REGLAS Y AUDITORÍA (MongoDB)
// =====================================================================
export const getRules = async () => {
    const response = await apiClient.get('rules');
    return response.data;
};

export const getAuditLogs = async () => {
    const response = await apiClient.get('rules/logs');
    return response.data;
};

export const getAuditStats = async () => {
    const response = await apiClient.get('rules/stats');
    return response.data;
};
