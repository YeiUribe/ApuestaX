import { useState, useEffect } from 'react';
import {
  getWallet,
  calcularDesgloseBilletera,
  rechargeWallet,
  withdrawWallet,
  preparePayment,
  confirmPaymentWebhook,
  getUserTickets,
  settleTicket,
  cancelTicket,
  getRules,
} from '../services/userService';

const BANCOS_PSE = ['Bancolombia', 'Nequi', 'Davivienda', 'Banco de Bogotá', 'DaviPlata'];

const CODIGOS_PROMO = {
  WOMPI100: { bono: 50000, desc: 'Bono +100% Recarga Wompi activado ($50.000 COP en Bono Activo)' },
  BETPLAY20: { bono: 25000, desc: 'Cashback 20% Liga BetPlay activado ($25.000 COP en Bono Activo)' },
  SUPERCUOTA: { bono: 30000, desc: 'Potenciador de Cuotas +25% activado ($30.000 COP en Bono Activo)' },
  BIENVENIDA50: { bono: 50000, desc: 'Bono de Bienvenida ApuestaX ($50.000 COP acreditados)' },
};

function WalletPanel({ user, initialSection = 'recarga', onBalanceChange }) {
  const activeCedula = user?.cedula || '';
  const isAdmin = user?.nombre_rol === 'Administrador';

  const [saldo, setSaldo] = useState(0);
  const [saldoReal, setSaldoReal] = useState(0);
  const [bonoActivo, setBonoActivo] = useState(0);
  const [puntosApuestaX, setPuntosApuestaX] = useState(1200);
  const [movimientos, setMovimientos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [reglas, setReglas] = useState([]);

  // 'recarga' | 'retiro' | 'promocion' | 'puntos' | 'cuenta' | 'historial' | 'ayuda'
  const [activeOperation, setActiveOperation] = useState(initialSection || 'recarga');
  const [ticketFilter, setTicketFilter] = useState('ALL');
  const [montoRecarga, setMontoRecarga] = useState(50000);
  const [bancoPse, setBancoPse] = useState('Bancolombia');
  const [montoRetiro, setMontoRetiro] = useState(20000);
  const [promoCodeInput, setPromoCodeInput] = useState('');

  // Estado del modal de Pasarela Wompi / PSE
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [showWompiModal, setShowWompiModal] = useState(false);
  const [wompiMethod, setWompiMethod] = useState('PSE'); // 'PSE' | 'NEQUI' | 'CARD'
  const [nequiPhone, setNequiPhone] = useState('3991111111');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (initialSection) {
      setActiveOperation(initialSection);
      setPaymentOrder(null);
    }
  }, [initialSection]);

  const applyWalletFromBackend = (walletData) => {
    const { saldoTotal, saldoReal: realCalc, bonoActivo: bonoCalc, movimientos: movs } =
      calcularDesgloseBilletera(walletData);
    setSaldo(saldoTotal);
    setSaldoReal(realCalc);
    setBonoActivo(bonoCalc);
    setMovimientos(movs);
    return { saldoTotal, saldoReal: realCalc, bonoActivo: bonoCalc, movimientos: movs };
  };

  const loadWalletAndHistory = async ({ strict = false } = {}) => {
    if (!activeCedula) {
      if (strict) {
        throw new Error('No se encontró la cédula del usuario autenticado.');
      }
      return null;
    }

    if (strict) {
      const walletData = await getWallet(activeCedula);
      if (!walletData || walletData.saldo_disponible === undefined) {
        throw new Error('PostgreSQL no devolvió información válida de la billetera.');
      }
      applyWalletFromBackend(walletData);

      const [ticketsRes, rulesRes] = await Promise.allSettled([
        getUserTickets(activeCedula),
        getRules(),
      ]);
      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTickets(ticketsRes.value);
        setPuntosApuestaX(1200 + ticketsRes.value.length * 150);
      }
      if (rulesRes.status === 'fulfilled' && Array.isArray(rulesRes.value)) {
        setReglas(rulesRes.value);
      }
      return walletData;
    }

    try {
      const [walletRes, ticketsRes, rulesRes] = await Promise.allSettled([
        getWallet(activeCedula),
        getUserTickets(activeCedula),
        getRules(),
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value?.saldo_disponible !== undefined) {
        applyWalletFromBackend(walletRes.value);
      } else if (walletRes.status === 'rejected') {
        setFeedback({
          type: 'error',
          text: 'No se pudo sincronizar el saldo desde PostgreSQL. Verifica la conexión con el servidor.',
        });
      }

      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTickets(ticketsRes.value);
        setPuntosApuestaX(1200 + ticketsRes.value.length * 150);
      }

      if (rulesRes.status === 'fulfilled' && Array.isArray(rulesRes.value)) {
        setReglas(rulesRes.value);
      }
      return walletRes.status === 'fulfilled' ? walletRes.value : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    loadWalletAndHistory();
  }, [activeCedula]);

  // Paso 1 Pasarela: Preparar orden en el backend (reference, amountInCents, signature SHA-256)
  const handlePrepareRecharge = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const numericAmount = Number(montoRecarga);

    if (!activeCedula) {
      setFeedback({ type: 'error', text: 'Debes iniciar sesión para realizar una recarga.' });
      return;
    }

    if (!numericAmount || numericAmount < 10000) {
      setFeedback({ type: 'error', text: 'El monto mínimo de recarga es de $10,000 COP.' });
      return;
    }

    setProcessing(true);
    try {
      const order = await preparePayment({
        cedula_usuario: activeCedula,
        monto: numericAmount,
        banco_origen: bancoPse,
      });

      if (!order?.reference || !order?.signature || !order?.amountInCents) {
        throw new Error('El servidor no devolvió una orden de pago válida.');
      }

      setPaymentOrder(order);
    } catch (err) {
      setPaymentOrder(null);
      setFeedback({
        type: 'error',
        text:
          err.response?.data?.message ||
          err.message ||
          'No se pudo preparar la orden de pago con el servidor.',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Paso 2A: Abrir el Checkout de Wompi
  const handleOpenWompiWidget = () => {
    if (!paymentOrder) return;

    const isRealMerchantKey =
      paymentOrder.publicKey &&
      paymentOrder.publicKey.startsWith('pub_test_') &&
      paymentOrder.publicKey !== 'pub_test_ApuestaXSandbox2026';

    if (
      isRealMerchantKey &&
      typeof window !== 'undefined' &&
      typeof window.WidgetCheckout === 'function'
    ) {
      try {
        const checkout = new window.WidgetCheckout({
          currency: paymentOrder.currency || 'COP',
          amountInCents: paymentOrder.amountInCents,
          reference: paymentOrder.reference,
          publicKey: paymentOrder.publicKey,
          signature: { integrity: paymentOrder.signature },
          customerData: {
            email: user?.correo || 'usuario@apuestax.com',
            fullName: `${user?.nombre || 'Usuario'} ${user?.apellido || ''}`.trim(),
            legalId: activeCedula,
            legalIdType: 'CC',
          },
        });

        checkout.open((result) => {
          const tx = result?.transaction;
          handleConfirmGateway(tx?.status || 'APPROVED');
        });
        return;
      } catch {
        // Continúa al modal interactivo Sandbox
      }
    }

    setShowWompiModal(true);
  };

  // Paso 2B: Confirmar transacción en PostgreSQL (/api/payments/webhook -> fallback idempotente /api/betting/wallet/recharge -> verificación getWallet)
  const handleConfirmGateway = async (status = 'APPROVED') => {
    if (!paymentOrder) return;
    setProcessing(true);
    setFeedback(null);
    setShowWompiModal(false);
    const recargaCop = Math.round(Number(paymentOrder.amountInCents || 0) / 100);
    const orderRef = paymentOrder.reference;
    const orderBank = paymentOrder.banco_origen || bancoPse;

    if (status !== 'APPROVED') {
      try {
        await confirmPaymentWebhook({
          ...paymentOrder,
          cedula_usuario: activeCedula,
          status,
        });
      } catch {
        // El registro de auditoría de pago rechazado no altera el saldo
      } finally {
        setPaymentOrder(null);
        setProcessing(false);
        setFeedback({
          type: 'error',
          text: `La transacción ${orderRef} fue rechazada por la entidad bancaria. No se modificó tu saldo.`,
        });
      }
      return;
    }

    try {
      if (!orderRef || !paymentOrder.signature || !recargaCop) {
        throw new Error(
          'La orden de pago no cuenta con referencia o firma de integridad válida.'
        );
      }

      let backendConfirmation = null;

      try {
        backendConfirmation = await confirmPaymentWebhook({
          ...paymentOrder,
          cedula_usuario: activeCedula,
          status: 'APPROVED',
        });
      } catch (webhookErr) {
        const httpStatus = webhookErr.response?.status;
        // Solo usar fallback si existe evidencia válida de aprobación (status === 'APPROVED', reference y signature)
        // y si el fallo no fue un rechazo de datos incompletos (400)
        if (httpStatus === 400) {
          throw webhookErr;
        }

        backendConfirmation = await rechargeWallet({
          cedula_usuario: activeCedula,
          monto: recargaCop,
          nombre_tipo: 'Recarga PSE',
          reference: orderRef,
          referencia_externa: orderRef,
          amountInCents: paymentOrder.amountInCents,
          currency: paymentOrder.currency || 'COP',
          signature: paymentOrder.signature,
          status: 'APPROVED',
          banco_origen: orderBank,
        });
      }

      const confirmedByBackend =
        backendConfirmation &&
        (backendConfirmation.persisted === true ||
          backendConfirmation.nuevo_saldo !== undefined);

      if (!confirmedByBackend) {
        throw new Error(
          'El servidor no confirmó la persistencia de la recarga en PostgreSQL.'
        );
      }

      // Consultar getWallet(cedula) como única fuente de verdad desde PostgreSQL
      const freshWallet = await loadWalletAndHistory({ strict: true });

      const persistedInPostgres =
        Array.isArray(freshWallet?.movimientos) &&
        freshWallet.movimientos.some(
          (m) =>
            m.referencia_externa === orderRef ||
            (m.nombre_tipo === 'Recarga PSE' &&
              Number(m.monto) === recargaCop &&
              Math.abs(new Date(m.fecha_hora).getTime() - Date.now()) < 120000)
        );

      if (!persistedInPostgres) {
        throw new Error(
          `La recarga ${orderRef} no aparece registrada en historial_billetera de PostgreSQL.`
        );
      }

      await onBalanceChange?.();

      setFeedback({
        type: 'success',
        text: `Recarga aprobada (${orderRef}) vía ${orderBank} por $${recargaCop.toLocaleString(
          'es-CO'
        )} COP. Confirmada en PostgreSQL.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err.response?.data?.message ||
          err.message ||
          'Error al persistir la recarga en PostgreSQL. Tu saldo no fue modificado.',
      });
    } finally {
      setPaymentOrder(null);
      setProcessing(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setFeedback(null);
    const numericWithdraw = Number(montoRetiro);

    if (!numericWithdraw || numericWithdraw < 20000) {
      setFeedback({ type: 'error', text: 'El monto mínimo de retiro bancario es de $20,000 COP.' });
      return;
    }

    if (numericWithdraw > saldo) {
      setFeedback({ type: 'error', text: 'No tienes saldo suficiente para realizar este retiro.' });
      return;
    }

    setProcessing(true);
    try {
      await withdrawWallet({
        cedula_usuario: activeCedula,
        monto: numericWithdraw,
      });
      await loadWalletAndHistory({ strict: true });
      await onBalanceChange?.();
      setFeedback({
        type: 'success',
        text: `Retiro bancario por $${numericWithdraw.toLocaleString('es-CO')} COP procesado exitosamente en PostgreSQL.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'No se pudo procesar el retiro en PostgreSQL.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeemPromo = async (e) => {
    e.preventDefault();
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) {
      setFeedback({ type: 'error', text: 'Ingresa un código promocional válido (ej. WOMPI100, BETPLAY20).' });
      return;
    }
    const found = CODIGOS_PROMO[clean];
    if (!found) {
      setFeedback({
        type: 'error',
        text: `El código "${clean}" no existe o ha expirado. Prueba con WOMPI100, BETPLAY20 o SUPERCUOTA.`,
      });
      return;
    }

    setProcessing(true);
    try {
      await rechargeWallet({
        cedula_usuario: activeCedula,
        monto: found.bono,
        nombre_tipo: 'Bono Promocional',
      });
      await loadWalletAndHistory({ strict: true });
      await onBalanceChange?.();
      setPuntosApuestaX((prev) => prev + 300);
      setPromoCodeInput('');
      setFeedback({
        type: 'success',
        text: `Promoción redimida y acreditada en PostgreSQL: ${found.desc} (+300 Puntos ApuestaX).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'No se pudo acreditar el bono promocional en PostgreSQL.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleExchangePoints = async () => {
    if (puntosApuestaX < 500) {
      setFeedback({ type: 'error', text: 'Necesitas al menos 500 Puntos ApuestaX para canjear por bono.' });
      return;
    }

    setProcessing(true);
    try {
      await rechargeWallet({
        cedula_usuario: activeCedula,
        monto: 15000,
        nombre_tipo: 'Bono Promocional',
      });
      await loadWalletAndHistory({ strict: true });
      await onBalanceChange?.();
      setPuntosApuestaX((prev) => prev - 500);
      setFeedback({
        type: 'success',
        text: 'Canje exitoso: convertiste 500 Puntos ApuestaX en $15.000 COP acreditados en PostgreSQL.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'No se pudo procesar el canje de puntos en PostgreSQL.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSettleTicket = async (codigoTicket, resultado) => {
    setFeedback(null);
    try {
      await settleTicket(codigoTicket, resultado);
      await loadWalletAndHistory({ strict: true });
      await onBalanceChange?.();
      setFeedback({
        type: 'success',
        text: `El ticket ${codigoTicket} fue liquidado como ${resultado}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || `No se pudo liquidar el ticket ${codigoTicket}.`,
      });
    }
  };

  const handleCancelTicket = async (codigoTicket) => {
    setFeedback(null);
    try {
      await cancelTicket(codigoTicket);
      await loadWalletAndHistory({ strict: true });
      await onBalanceChange?.();
      setFeedback({
        type: 'success',
        text: `El ticket ${codigoTicket} fue anulado y el saldo fue reembolsado en PostgreSQL.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || `No se pudo anular el ticket ${codigoTicket}.`,
      });
    }
  };

  // Determinar qué vista principal mostrar según la opción elegida en el menú superior
  const isCashierView = activeOperation === 'recarga' || activeOperation === 'retiro';
  const isBonusesView = activeOperation === 'promocion' || activeOperation === 'puntos';
  const isHistoryView = activeOperation === 'historial';
  const isAccountView = activeOperation === 'cuenta';
  const isHelpView = activeOperation === 'ayuda';

  const sectionMeta = isCashierView
    ? {
        title: 'Cajero:',
        highlight: 'Recargas y Retiros',
        subtitle: 'Deposita al instante vía Wompi / PSE o retira tus ganancias a tu cuenta bancaria.',
      }
    : isBonusesView
      ? {
          title: 'Centro de',
          highlight: 'Bonos y Puntos ApuestaX',
          subtitle: 'Canjea tus puntos acumulados por saldo de bono o activa códigos promocionales.',
        }
      : isHistoryView
        ? {
            title: 'Mis Apuestas y',
            highlight: 'Movimientos',
            subtitle: 'Consulta el estado de tus tickets emitidos y el extracto completo de tu billetera.',
          }
        : isAccountView
          ? {
              title: 'Perfil de',
              highlight: 'Mi Cuenta',
              subtitle: 'Información verificada del titular y resumen general de saldos.',
            }
          : {
              title: 'Centro de',
              highlight: 'Ayuda y Reglas',
              subtitle: 'Límites oficiales de operación y guía de liquidación de mercados deportivos.',
            };

  const filteredTickets = tickets.filter((tk) => {
    if (ticketFilter === 'ALL') return true;
    if (ticketFilter === 'Perdida') return tk.estado_ticket === 'Perdida' || tk.estado_ticket === 'Anulada';
    return tk.estado_ticket === ticketFilter;
  });

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabecera Dinámica según la sección activa (sin tarjetas de saldo redundantes con la barra superior) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {sectionMeta.title} <span className="text-[#39FF14]">{sectionMeta.highlight}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{sectionMeta.subtitle}</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs border flex items-center justify-between ${feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 1: CAJERO (RECARGAS WOMPI / PSE Y RETIROS BANCARIOS)            */}
      {/* ===================================================================== */}
      {isCashierView && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Selector interno solo entre Depositar y Retirar */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveOperation('recarga');
                  setPaymentOrder(null);
                }}
                className={`py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${activeOperation === 'recarga'
                    ? 'bg-[#39FF14] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                Depositar Saldo (Wompi / PSE)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveOperation('retiro');
                  setPaymentOrder(null);
                }}
                className={`py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${activeOperation === 'retiro'
                    ? 'bg-[#39FF14] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                Retirar a Cuenta Bancaria
              </button>
            </div>

            {activeOperation === 'recarga' ? (
              !paymentOrder ? (
                <form onSubmit={handlePrepareRecharge} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Entidad Bancaria o Billetera (PSE / Wompi)
                    </label>
                    <select
                      value={bancoPse}
                      onChange={(e) => setBancoPse(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                    >
                      {BANCOS_PSE.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Monto a Recargar (Mínimo $10,000 COP)
                    </label>
                    <input
                      type="number"
                      min="10000"
                      step="5000"
                      value={montoRecarga}
                      onChange={(e) => setMontoRecarga(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 text-white font-mono text-base rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                    />
                    <div className="grid grid-cols-4 gap-2 mt-2.5">
                      {[20000, 50000, 100000, 200000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMontoRecarga(preset)}
                          className={`py-2 rounded-lg font-mono text-xs font-bold border transition cursor-pointer ${Number(montoRecarga) === preset
                              ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14]'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                            }`}
                        >
                          +${(preset / 1000).toLocaleString('es-CO')}k
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3.5 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-sm hover:brightness-110 transition cursor-pointer shadow-lg shadow-[#39FF14]/20"
                  >
                    {processing ? 'Preparando orden de pago...' : 'Continuar a Pasarela Wompi'}
                  </button>
                </form>
              ) : (
                <div className="bg-slate-950 border border-[#39FF14]/40 rounded-xl p-5 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-extrabold text-[#39FF14] uppercase">
                      Orden de Recarga Lista
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaymentOrder(null)}
                      className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                    >
                      Cambiar monto
                    </button>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Referencia:</span>
                      <span className="font-mono font-bold text-white">{paymentOrder.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entidad seleccionada:</span>
                      <span className="font-semibold text-white">{paymentOrder.banco_origen}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total a pagar:</span>
                      <span className="font-mono font-bold text-[#39FF14] text-sm">
                        ${(paymentOrder.amountInCents / 100).toLocaleString('es-CO')} COP
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleOpenWompiWidget}
                    className="w-full py-3 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold hover:brightness-110 transition cursor-pointer shadow-md shadow-[#39FF14]/20"
                  >
                    Pagar Ahora en Wompi
                  </button>
                </div>
              )
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Entidad Destino para Transferencia
                  </label>
                  <select
                    value={bancoPse}
                    onChange={(e) => setBancoPse(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                  >
                    {BANCOS_PSE.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Monto a Retirar (Mínimo $20,000 COP • Disponible: ${saldo.toLocaleString('es-CO')} COP)
                  </label>
                  <input
                    type="number"
                    min="20000"
                    step="5000"
                    value={montoRetiro}
                    onChange={(e) => setMontoRetiro(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 text-white font-mono text-base rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3.5 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-sm hover:brightness-110 transition cursor-pointer shadow-lg shadow-[#39FF14]/20"
                >
                  {processing ? 'Procesando...' : 'Solicitar Retiro Bancario'}
                </button>
              </form>
            )}
          </div>

          {/* Resumen lateral de últimos movimientos de saldo */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Movimientos Recientes de Saldo
              </h2>
              <button
                type="button"
                onClick={() => setActiveOperation('historial')}
                className="text-xs font-bold text-[#39FF14] hover:underline cursor-pointer"
              >
                Ver mis apuestas →
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {movimientos.slice(0, 6).map((mov, idx) => {
                const esIngreso =
                  mov.naturaleza_movimiento === 'Ingreso' ||
                  ['Recarga PSE', 'Pago Premio', 'Bono Bienvenida'].includes(mov.nombre_tipo);

                return (
                  <div
                    key={`${mov.fecha_hora}-${idx}`}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{mov.nombre_tipo}</span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(mov.fecha_hora).toLocaleString('es-CO', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-extrabold text-sm ${esIngreso ? 'text-[#39FF14]' : 'text-amber-300'
                        }`}
                    >
                      {esIngreso ? '+' : '-'}${Number(mov.monto).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: BONOS Y PUNTOS APUESTAX (UNIFICADA Y ACCIONABLE)             */}
      {/* ===================================================================== */}
      {isBonusesView && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Tarjeta 1: Puntos ApuestaX */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-white">Programa de Puntos ApuestaX</h2>
              <p className="text-xs text-slate-400 mt-1">
                Cada apuesta en Liga BetPlay y cada recarga suma puntos canjeables por saldo de Bono Activo.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                  Puntos Disponibles
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#39FF14] font-mono">
                  {puntosApuestaX.toLocaleString('es-CO')} PTS
                </span>
              </div>
              <div className="text-right text-xs text-slate-400">
                <span>Tasa de canje:</span>
                <strong className="block text-white text-sm">500 PTS = $15.000 COP</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExchangePoints}
              className="w-full py-3.5 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-sm hover:brightness-110 transition cursor-pointer shadow-lg shadow-[#39FF14]/20"
            >
              Canjear 500 Puntos por $15.000 COP en Bono Activo
            </button>
          </div>

          {/* Tarjeta 2: Redimir Código Promocional */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-white">Redimir Código Promocional</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tu código promocional o selecciona uno de los bonos disponibles abajo.
              </p>
            </div>

            <form onSubmit={handleRedeemPromo} className="flex gap-2">
              <input
                type="text"
                placeholder="Ingresa tu código (ej. WOMPI100)"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-950 text-white font-mono uppercase text-sm rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer shrink-0"
              >
                Activar Bono
              </button>
            </form>

            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Códigos Disponibles para tu Cuenta:
              </span>
              {Object.entries(CODIGOS_PROMO).map(([code, info]) => (
                <div
                  key={code}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-mono font-extrabold text-xs text-[#39FF14] block">
                      {code}
                    </span>
                    <span className="text-xs text-slate-300">{info.desc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromoCodeInput(code)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-[#39FF14] text-slate-200 hover:text-slate-950 text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    Usar código
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: MIS APUESTAS Y MOVIMIENTOS (HISTORIAL DEDICADO)              */}
      {/* ===================================================================== */}
      {isHistoryView && (
        <div className="space-y-6">
          {/* Historial de Tickets con filtros por estado */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
              <h2 className="text-lg font-extrabold text-white">
                Mis Tickets de Apuesta ({filteredTickets.length})
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'Pendiente', label: 'Pendientes' },
                  { id: 'Ganada', label: 'Ganadas' },
                  { id: 'Perdida', label: 'Perdidas / Anuladas' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTicketFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${ticketFilter === f.id
                        ? 'bg-[#39FF14] text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">
                No tienes tickets registrados en este estado.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((tk) => (
                  <div
                    key={tk.codigo_ticket}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-[#39FF14]">
                          {tk.codigo_ticket}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          Pago: {tk.origen_fondos}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tk.estado_ticket === 'Ganada'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : tk.estado_ticket === 'Perdida' || tk.estado_ticket === 'Anulada'
                                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                        >
                          {tk.estado_ticket}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap gap-4 pt-1">
                        <span>
                          Monto Apostado:{' '}
                          <strong className="font-mono text-white">
                            ${Number(tk.monto_total).toLocaleString('es-CO')} COP
                          </strong>
                        </span>
                        <span>
                          Retorno Potencial:{' '}
                          <strong className="font-mono text-[#39FF14]">
                            ${Number(tk.posible_ganancia_total).toLocaleString('es-CO')} COP
                          </strong>
                        </span>
                      </div>

                      {Array.isArray(tk.lineas) && tk.lineas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tk.lineas.map((l, idx) => (
                            <span
                              key={`${tk.codigo_ticket}-${idx}`}
                              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 font-medium"
                            >
                              {l.codigo_partido}: <strong className="text-[#39FF14]">{l.nombre_mercado}</strong> (@
                              {Number(l.valor_cuota_congelada).toFixed(2)})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {tk.estado_ticket === 'Pendiente' && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSettleTicket(tk.codigo_ticket, 'Ganada')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                            >
                              Liquidar Ganada
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSettleTicket(tk.codigo_ticket, 'Perdida')}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                            >
                              Perdida
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancelTicket(tk.codigo_ticket)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-xs font-semibold transition cursor-pointer"
                        >
                          Anular Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracto de Movimientos Financieros */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-white pb-3 mb-4 border-b border-slate-800">
              Extracto de Movimientos de Billetera
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {movimientos.map((mov, idx) => {
                const esIngreso =
                  mov.naturaleza_movimiento === 'Ingreso' ||
                  ['Recarga PSE', 'Pago Premio', 'Bono Bienvenida'].includes(mov.nombre_tipo);

                return (
                  <div
                    key={`${mov.fecha_hora}-${idx}`}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{mov.nombre_tipo}</span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(mov.fecha_hora).toLocaleString('es-CO', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-extrabold text-sm ${esIngreso ? 'text-[#39FF14]' : 'text-amber-300'
                        }`}
                    >
                      {esIngreso ? '+' : '-'}${Number(mov.monto).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 4: MI CUENTA (PERFIL DEDICADO DEL TITULAR)                      */}
      {/* ===================================================================== */}
      {isAccountView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-lg font-extrabold text-white border-b border-slate-800 pb-3">
              Información del Titular de la Cuenta
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Nombre Completo</span>
                <strong className="text-base text-white font-bold">
                  {user?.nombre} {user?.apellido}
                </strong>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Documento de Identidad (C.C.)</span>
                <strong className="text-base font-mono text-white font-bold">{activeCedula}</strong>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Correo Electrónico Registrado</span>
                <strong className="text-sm text-white font-bold">
                  {user?.correo || 'usuario@apuestax.com'}
                </strong>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Estado de la Cuenta</span>
                <strong className="text-sm text-[#39FF14] font-extrabold">
                  Activa y Verificada ✓
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-extrabold text-white border-b border-slate-800 pb-3">
              Resumen de Actividad
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/70">
                <span className="text-slate-400">Tickets Emitidos:</span>
                <strong className="text-white font-mono">{tickets.length}</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/70">
                <span className="text-slate-400">Puntos ApuestaX:</span>
                <strong className="text-[#39FF14] font-mono">
                  {puntosApuestaX.toLocaleString('es-CO')} PTS
                </strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/70">
                <span className="text-slate-400">Saldo Real:</span>
                <strong className="text-white font-mono">
                  ${saldoReal.toLocaleString('es-CO')} COP
                </strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/70">
                <span className="text-slate-400">Bono Activo:</span>
                <strong className="text-[#39FF14] font-mono">
                  ${bonoActivo.toLocaleString('es-CO')} COP
                </strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Saldo Total Disponible:</span>
                <strong className="text-[#39FF14] font-mono">
                  ${saldo.toLocaleString('es-CO')} COP
                </strong>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveOperation('recarga')}
                className="w-full py-2.5 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
              >
                Ir a Recargar Saldo
              </button>
              <button
                type="button"
                onClick={() => setActiveOperation('promocion')}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Canjear Puntos y Bonos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 5: AYUDA Y REGLAS OFICIALES DE LA PLATAFORMA                    */}
      {/* ===================================================================== */}
      {isHelpView && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-extrabold text-white border-b border-slate-800 pb-3">
              Límites y Políticas Vigentes
            </h2>
            <ul className="space-y-3 text-xs">
              {reglas.map((r) => (
                <li
                  key={r.codigo_regla}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center"
                >
                  <span className="text-slate-300 font-medium">{r.descripcion_regla}</span>
                  <strong className="text-[#39FF14] font-mono text-sm">
                    {r.codigo_regla === 'EDAD_MINIMA'
                      ? `${r.valor_numerico} años`
                      : `$${Number(r.valor_numerico).toLocaleString('es-CO')} COP`}
                  </strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-extrabold text-white border-b border-slate-800 pb-3">
              Guía Rápida de Mercados de Apuesta
            </h2>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-[#39FF14] block mb-1">1X2 (Gana Local / Empate / Gana Visitante)</strong>
                Pronostica el resultado del partido al finalizar el tiempo reglamentario.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-[#39FF14] block mb-1">+2.5 Goles / -2.5 Goles</strong>
                En <strong>Más de 2.5 Goles</strong> ganas si la suma de goles de ambos equipos es de 3 o más. En{' '}
                <strong>Menos de 2.5 Goles</strong> ganas si el partido termina con 0, 1 o 2 goles en total.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-[#39FF14] block mb-1">Ambos Marcan</strong>
                Ganas tu apuesta si tanto el equipo local como el equipo visitante anotan al menos 1 gol durante el partido (ej. 1-1, 2-1, 2-2).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL INTERACTIVO DE CHECKOUT WOMPI SANDBOX */}
      {/* ===================================================================== */}
      {showWompiModal && paymentOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#39FF14]/20 border border-[#39FF14] flex items-center justify-center font-black text-[#39FF14] text-sm">
                  W
                </div>
                <div>
                  <span className="font-extrabold text-sm block leading-none">
                    Pasarela de Pagos Wompi
                  </span>
                  <span className="text-[11px] text-slate-400">Comercio: ApuestaX Colombia</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWompiModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-100 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                  Referencia: {paymentOrder.reference}
                </span>
                <span className="text-xs text-slate-600">
                  Pagador: {user?.nombre} {user?.apellido} (C.C. {activeCedula})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Total COP</span>
                <span className="text-lg font-black text-slate-900">
                  ${(paymentOrder.amountInCents / 100).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PSE', label: 'PSE Bancos' },
                  { id: 'NEQUI', label: 'Nequi' },
                  { id: 'CARD', label: 'Tarjeta' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setWompiMethod(m.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${wompiMethod === m.id
                        ? 'bg-slate-900 text-[#39FF14] border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {wompiMethod === 'PSE' && (
                <div className="space-y-2 text-xs">
                  <label className="block font-bold text-slate-700">
                    Entidad Financiera Seleccionada
                  </label>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 flex justify-between">
                    <span>{paymentOrder.banco_origen}</span>
                    <span className="text-emerald-600 font-bold">Persona Natural</span>
                  </div>
                </div>
              )}

              {wompiMethod === 'NEQUI' && (
                <div className="space-y-2 text-xs">
                  <label className="block font-bold text-slate-700">
                    Número de Celular Nequi
                  </label>
                  <input
                    type="text"
                    value={nequiPhone}
                    onChange={(e) => setNequiPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-slate-900 outline-none"
                  />
                </div>
              )}

              {wompiMethod === 'CARD' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-mono text-slate-800">
                    <span>Tarjeta VISA:</span>
                    <strong>4242 •••• •••• 4242</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Exp: 12/29</span>
                    <span>CVC: •••</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    handleConfirmGateway(
                      wompiMethod === 'NEQUI' && nequiPhone === '3992222222'
                        ? 'DECLINED'
                        : 'APPROVED'
                    )
                  }
                  className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#39FF14] font-extrabold text-xs transition cursor-pointer shadow-lg"
                >
                  Confirmar Pago Aprobado
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleConfirmGateway('DECLINED')}
                  className="py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition cursor-pointer"
                >
                  Simular Pago Rechazado
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>✓ Pagos Seguros por Wompi</span>
              <span className="font-semibold">Grupo Cibest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletPanel;
