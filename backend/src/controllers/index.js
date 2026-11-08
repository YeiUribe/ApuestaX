const {
    IdentityService,
    WalletService,
    BettingService,
    AuditService,
    PaymentService,
    DashboardService,
} = require('../services');

const AuthController = {
    async getProfile(req, res) {
        const user = await IdentityService.getUserProfile(req.params.cedula);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        res.json(user);
    },
};

const WalletController = {
    async getWallet(req, res) {
        const wallet = await WalletService.getBalance(req.params.cedula);
        res.json(wallet || { cedula_usuario: req.params.cedula, saldo_disponible: 0 });
    },
};

const BetController = {
    async getHistory(req, res) {
        const tickets = await BettingService.getUserHistory(req.params.cedula);
        res.json(tickets);
    },
};

const DashboardController = {
    async getDashboard(req, res) {
        const data = await DashboardService.getAggregatedDashboard(req.params.cedula);
        res.json(data);
    },
};

const PaymentController = {
    prepare(req, res) {
        const { cedula_usuario, monto, banco_origen = 'Bancolombia' } = req.body;
        const reference = `PSE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const amountInCents = Math.round(Number(monto) * 100);
        const signature = PaymentService.generateWompiSignature(reference, amountInCents, 'COP');

        res.json({
            reference,
            amountInCents,
            currency: 'COP',
            signature,
            publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_ApuestaXSandbox2026',
            cedula_usuario,
            banco_origen,
        });
    },
};

module.exports = {
    AuthController,
    WalletController,
    BetController,
    DashboardController,
    PaymentController,
    AuditService,
};

