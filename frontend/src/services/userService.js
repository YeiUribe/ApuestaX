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
    return response.data;
};

export const logoutSession = () => {
    localStorage.removeItem('apuestax_jwt');
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
