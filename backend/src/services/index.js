const crypto = require('crypto');

const {
    IdentityRepository,
    SportsRepository,
    WalletRepository,
    BetRepository,
    RulesRepository,
    AuditRepository,
} = require('../repositories');


// ============================================================
// IDENTITY SERVICE
// ============================================================

const IdentityService = {
    getUserProfile: (cedula) =>
        IdentityRepository.findUserByCedula(cedula),

    listAllUsers: () =>
        IdentityRepository.findAllUsers(),
};


// ============================================================
// SPORTS SERVICE
// ============================================================

const SportsService = {
    getMatch: (codigoPartido) =>
        SportsRepository.findMatchByCode(codigoPartido),

    listMatches: () =>
        SportsRepository.findAllMatches(),
};


// ============================================================
// WALLET SERVICE
// ============================================================

const WalletService = {
    getBalance: (cedula) =>
        WalletRepository.getWalletByCedula(cedula),

    recharge: (cedula, monto, tipo) =>
        WalletRepository.rechargeUsingFunction(
            cedula,
            monto,
            tipo
        ),
};


// ============================================================
// BETTING SERVICE
// ============================================================

const BettingService = {
    getUserHistory: (cedula) =>
        BetRepository.findTicketsByUser(cedula),

    settleTicket: (codigoTicket, resultado) =>
        BetRepository.settleTicketUsingFunction(
            codigoTicket,
            resultado
        ),

    cancelTicket: (codigoTicket) =>
        BetRepository.cancelTicketUsingFunction(codigoTicket),
};


// ============================================================
// AUDIT SERVICE
// ============================================================

const AuditService = {
    record: (data) =>
        AuditRepository.logEvent(data),

    getLogs: (limit) =>
        AuditRepository.getRecentLogs(limit),

    getStats: () =>
        AuditRepository.getAggregatedStats(),
};


// ============================================================
// PAYMENT SERVICE
// ============================================================

const PaymentService = {

    // --------------------------------------------------------
    // Generar firma de integridad para una transacción Wompi
    // --------------------------------------------------------

    generateWompiSignature(
        reference,
        amountInCents,
        currency = 'COP'
    ) {
        const integritySecret =
            process.env.WOMPI_INTEGRITY_SECRET ||
            'test_integrity_secret_apuestax_2026';

        const raw =
            `${reference}${amountInCents}${currency}${integritySecret}`;

        return crypto
            .createHash('sha256')
            .update(raw)
            .digest('hex');
    },


    // --------------------------------------------------------
    // Verificar firma/checksum de Webhook Wompi
    // --------------------------------------------------------

    verifyWompiWebhookChecksum(eventBody) {
        const eventsSecret =
            process.env.WOMPI_EVENTS_SECRET ||
            'test_events_secret_apuestax_2026';

        const isDevelopment =
            process.env.NODE_ENV === 'development';

        const hasValidSignatureStructure =
            Boolean(eventBody?.signature?.checksum) &&
            Array.isArray(eventBody?.signature?.properties);


        // ----------------------------------------------------
        // Sandbox local
        // ----------------------------------------------------
        // En desarrollo permitimos eventos sin firma para
        // continuar utilizando el Sandbox local.
        //
        // En producción, si no existe firma, se rechaza.
        // ----------------------------------------------------

        if (!hasValidSignatureStructure) {

            if (isDevelopment) {

                console.warn(
                    '[Wompi] Webhook sin firma permitido por NODE_ENV=development'
                );

                return true;
            }

            console.error(
                '[Wompi] Webhook rechazado: firma inexistente.'
            );

            return false;
        }


        // ----------------------------------------------------
        // Validación del webhook firmado
        // ----------------------------------------------------

        try {
            const values =
                eventBody.signature.properties.map(
                    (propPath) => {
                        return propPath
                            .split('.')
                            .reduce(
                                (obj, key) => obj?.[key],
                                eventBody.data
                            );
                    }
                );


            const rawString =
                `${values.join('')}` +
                `${eventBody.timestamp}` +
                `${eventsSecret}`;


            const calculated =
                crypto
                    .createHash('sha256')
                    .update(rawString)
                    .digest('hex');


            return (
                calculated.toLowerCase() ===
                String(
                    eventBody.signature.checksum
                ).toLowerCase()
            );

        } catch (error) {

            console.error(
                '[Wompi] Error validando checksum:',
                error.message
            );

            return false;
        }
    },
};


// ============================================================
// DASHBOARD SERVICE
// ============================================================

const DashboardService = {

    async getAggregatedDashboard(cedula) {

        const [
            usuario,
            saldo,
            apuestasRecientes,
            proximosPartidos,
            mercados,
            reglas,
        ] = await Promise.all([

            IdentityRepository
                .findUserByCedula(cedula)
                .catch(() => null),

            WalletRepository
                .getWalletByCedula(cedula)
                .catch(() => ({
                    cedula_usuario: cedula,
                    saldo_disponible: 150000,
                })),

            BetRepository
                .findTicketsByUser(cedula)
                .catch(() => []),

            SportsRepository
                .findAllMatches()
                .catch(() => []),

            RulesRepository
                .getActiveMarkets()
                .catch(() => []),

            RulesRepository
                .getActiveRules()
                .catch(() => []),
        ]);


        return {
            usuario,
            saldo,
            apuestasRecientes:
                apuestasRecientes.slice(0, 5),

            proximosPartidos:
                proximosPartidos.slice(0, 5),

            mercados,
            reglas,
        };
    },
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    IdentityService,
    SportsService,
    WalletService,
    BettingService,
    AuditService,
    PaymentService,
    DashboardService,
};