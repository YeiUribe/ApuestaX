import { useState, useEffect, useRef } from 'react';
import UserList from './components/UserList';
import AuthPage from './components/Login';
import WelcomeDashboard from './components/WelcomeDashboard';
import MatchesPanel from './components/MatchesPanel';
import WalletPanel from './components/WalletPanel';
import { logoutSession, getWallet, calcularDesgloseBilletera } from './services/userService';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('apuestax_user');
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return parsed?.cedula ? parsed : null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('apuestax_view') || 'dashboard';
  }); // 'dashboard' | 'matches' | 'wallet' | 'users'
  const [walletSection, setWalletSection] = useState(() => {
    return localStorage.getItem('apuestax_wallet_section') || 'recarga';
  }); // 'recarga' | 'retiro' | 'historial' | 'promocion' | 'puntos' | 'cuenta' | 'ayuda'
  const [pendingQuickBet, setPendingQuickBet] = useState(null);

  // Menú desplegable superior derecho (estilo BetPlay / ApuestaX)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Cronómetro de sesión en vivo (HH:MM:SS)
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Saldos en vivo para el menú desplegable del Usuario
  const [saldoReal, setSaldoReal] = useState(0);
  const [bonoActivo, setBonoActivo] = useState(0);
  const [bonoPendiente, setBonoPendiente] = useState(0);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const isAdmin = currentUser?.nombre_rol === 'Administrador';

  // Cargar billetera del usuario autenticado
  const fetchUserBalance = async (cedula) => {
    if (!cedula) return;
    setRefreshingBalance(true);
    try {
      const data = await getWallet(cedula);
      if (data && data.saldo_disponible !== undefined) {
        const { saldoReal: realCalc, bonoActivo: bonoCalc } = calcularDesgloseBilletera(data);
        setSaldoReal(realCalc);
        setBonoActivo(bonoCalc);
        setBonoPendiente(0);
      }
    } catch {
      // Mantiene el último valor conocido
    } finally {
      setTimeout(() => setRefreshingBalance(false), 300);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setSessionSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.nombre_rol === 'Administrador') {
      return;
    }

    // Consultar inmediatamente
    fetchUserBalance(currentUser.cedula);

    // Actualizar el saldo cada 5 segundos
    const balanceTimer = setInterval(() => {
      fetchUserBalance(currentUser.cedula);
    }, 5000);

    return () => clearInterval(balanceTimer);
  }, [currentUser, currentView]);


  // Cerrar el menú flotante al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatSessionTime = (totalSec) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleLoginSuccess = (user) => {
    const normalizedUser = user?.user || user;
    setCurrentUser(normalizedUser);
    try {
      localStorage.setItem('apuestax_user', JSON.stringify(normalizedUser));
      localStorage.setItem('apuestax_view', 'dashboard');
    } catch {
      // Ignorar si el navegador restringe almacenamiento
    }
    setCurrentView('dashboard');
    setSessionSeconds(0);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logoutSession();
    setCurrentUser(null);
    setCurrentView('dashboard');
    setMenuOpen(false);
  };

  const openUserSection = (section) => {
    setWalletSection(section);
    setCurrentView('wallet');
    try {
      localStorage.setItem('apuestax_wallet_section', section);
      localStorage.setItem('apuestax_view', 'wallet');
    } catch {
      // Ignorar errores de almacenamiento
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem('apuestax_view', currentView);
        localStorage.setItem('apuestax_wallet_section', walletSection);
      } catch {
        // Ignorar errores de almacenamiento
      }
    }
  }, [currentUser, currentView, walletSection]);

  // Si el usuario no ha iniciado sesión, solo puede ver la pantalla de Autenticación
  if (!currentUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const saldoTotal = saldoReal + bonoActivo;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden">
      {/* Barra de navegación superior 100% responsive (Móvil y Escritorio) */}
      <nav className="w-full bg-[#060d24] border-b border-slate-800/90 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 z-40 sticky top-0 shadow-lg">
        {/* Logo de Marca (Orden 1 en móvil y escritorio) */}
        <div
          onClick={() => setCurrentView('dashboard')}
          className="order-1 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-slate-900 border border-[#39FF14]/50 flex items-center justify-center text-[#39FF14] font-black text-base shadow-sm">
            A
          </span>
          <span className="font-extrabold text-base sm:text-lg text-white tracking-wide">
            APUESTA<span className="text-[#39FF14]">X</span>
          </span>
          {isAdmin && (
            <span className="hidden sm:inline-block ml-1 px-2 py-0.5 rounded-md bg-[#39FF14]/15 border border-[#39FF14]/40 text-[10px] font-extrabold uppercase text-[#39FF14]">
              Consola Admin
            </span>
          )}
        </div>

        {/* Pestañas centrales de navegación (Orden 3 en móvil ocupando ancho completo; Orden 2 en escritorio) */}
        <div
          className={`order-3 md:order-2 w-full md:w-auto grid ${
            isAdmin ? 'grid-cols-3' : 'grid-cols-4'
          } md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 gap-1`}
        >
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className={`px-2 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center truncate ${
              currentView === 'dashboard'
                ? 'bg-[#39FF14] text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {isAdmin ? 'Consola' : 'Inicio'}
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('matches')}
            className={`px-2 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center truncate ${
              currentView === 'matches'
                ? 'bg-[#39FF14] text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="sm:hidden">{isAdmin ? 'Partidos' : 'Partidos'}</span>
            <span className="hidden sm:inline">
              {isAdmin ? 'Control de Partidos' : 'Deportes • Liga BetPlay'}
            </span>
          </button>

          {!isAdmin && (
            <>
              <button
                type="button"
                onClick={() => openUserSection('historial')}
                className={`px-2 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center truncate ${
                  currentView === 'wallet' && walletSection === 'historial'
                    ? 'bg-[#39FF14] text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="sm:hidden">Apuestas</span>
                <span className="hidden sm:inline">Mis Apuestas</span>
              </button>

              <button
                type="button"
                onClick={() => openUserSection('recarga')}
                className={`px-2 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center truncate ${
                  currentView === 'wallet' &&
                  (walletSection === 'recarga' || walletSection === 'retiro')
                    ? 'bg-[#39FF14] text-slate-950 shadow-sm'
                    : 'text-[#39FF14] hover:bg-[#39FF14]/15'
                }`}
              >
                + Recargar
              </button>
            </>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setCurrentView('users')}
              className={`px-2 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center truncate ${
                currentView === 'users'
                  ? 'bg-[#39FF14] text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Usuarios
            </button>
          )}
        </div>

        {/* Zona Derecha: Nombre del Usuario, Saldo Rápido y Menú Desplegable (⋮) (Orden 2 en móvil, Orden 3 en escritorio) */}
        {isAdmin ? (
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {currentUser.nombre} {currentUser.apellido}
              </span>
              <span className="text-[11px] font-semibold text-[#39FF14]">
                Sesión {formatSessionTime(sessionSeconds)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/15 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30 text-xs font-semibold transition cursor-pointer"
            >
              Salir
            </button>
          </div>
        ) : (
          <div className="order-2 md:order-3 relative" ref={menuRef}>
            <div
              onClick={() => {
                if (!menuOpen) fetchUserBalance(currentUser.cedula);
                setMenuOpen((prev) => !prev);
              }}
              className="flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer select-none"
            >
              {/* Saldo visible en móvil y escritorio */}
              <div className="flex flex-col text-right">
                <span className="text-[11px] sm:text-xs font-bold text-white leading-tight truncate max-w-[110px] sm:max-w-[160px]">
                  {currentUser.nombre} {currentUser.apellido}
                </span>
                <span className="text-[11px] font-extrabold text-[#39FF14] font-mono leading-tight">
                  ${saldoTotal.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="hidden lg:flex flex-col items-center text-[10px] leading-tight text-slate-400 font-medium pl-2 border-l border-slate-800">
                <span>Sesión</span>
                <span className="font-mono text-slate-200">{formatSessionTime(sessionSeconds)}</span>
              </div>

              <button
                type="button"
                aria-label="Abrir menú de usuario y saldo"
                className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:bg-slate-700/80 transition cursor-pointer shrink-0"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </div>

            {/* MENÚ DESPLEGABLE DE SALDO Y OPCIONES CON LOS COLORES DEL PROYECTO (#0b132b + #39FF14) */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-[290px] rounded-2xl bg-[#0b132b] text-slate-100 shadow-2xl shadow-black/80 border border-slate-700/90 py-4 px-5 z-50 animate-fadeIn">
                {/* Bloque de Saldos con botón de refrescar */}
                <div className="space-y-2.5 text-sm pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Saldo:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#39FF14] font-mono">
                        ${saldoTotal.toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchUserBalance(currentUser.cedula);
                        }}
                        title="Actualizar saldo"
                        className={`text-slate-300 hover:text-[#39FF14] transition cursor-pointer ${refreshingBalance ? 'animate-spin text-[#39FF14]' : ''
                          }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pr-6">
                    <span className="text-slate-300 font-medium">Saldo Real:</span>
                    <span className="font-bold text-white font-mono">
                      ${saldoReal.toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pr-6">
                    <span className="text-slate-300 font-medium">Bono Activo:</span>
                    <span className="font-bold text-[#39FF14] font-mono">
                      ${bonoActivo.toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pr-6">
                    <span className="text-slate-300 font-medium">Bono Pendiente:</span>
                    <span className="font-bold text-slate-400 font-mono">
                      ${bonoPendiente.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Lista de Navegación Consolidada y sin botones redundantes */}
                <div className="py-3 space-y-1 text-sm">
                  {[
                    { id: 'recarga', label: 'Recargar y Retirar' },
                    { id: 'historial', label: 'Mis Apuestas y Movimientos' },
                    { id: 'promocion', label: 'Bonos y Puntos ApuestaX' },
                    { id: 'cuenta', label: 'Mi Cuenta' },
                    { id: 'ayuda', label: 'Ayuda y Reglas' },
                  ].map((item) => {
                    const isActive =
                      currentView === 'wallet' &&
                      (walletSection === item.id ||
                        (item.id === 'recarga' && walletSection === 'retiro') ||
                        (item.id === 'promocion' && walletSection === 'puntos'));
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openUserSection(item.id)}
                        className={`w-full text-left py-2 px-3 rounded-xl font-medium transition cursor-pointer flex items-center justify-between ${isActive
                            ? 'bg-[#39FF14]/15 text-[#39FF14] font-bold'
                            : 'text-slate-300 hover:text-[#39FF14] hover:bg-slate-800/70'
                          }`}
                      >
                        <span>{item.label}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Botón Cerrar Sesión centrado */}
                <div className="pt-2 border-t border-slate-800/80 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-2 px-6 py-2 rounded-xl border border-[#39FF14]/50 bg-slate-900 hover:bg-[#39FF14] text-[#39FF14] hover:text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Renderizado de la vista seleccionada */}
      {currentView === 'dashboard' ? (
        <WelcomeDashboard
          user={currentUser}
          onViewMatches={() => setCurrentView('matches')}
          onSelectQuickBet={(match, market, odd) => {
            setPendingQuickBet({
              match,
              market,
              odd,
              ts: Date.now(),
            });
            setCurrentView('matches');
          }}
          onViewWallet={(sec = 'recarga') => {
            if (isAdmin) {
              setCurrentView('users');
            } else {
              openUserSection(sec);
            }
          }}
        />
      ) : currentView === 'matches' ? (
        <MatchesPanel
          user={currentUser}
          pendingQuickBet={pendingQuickBet}
          onClearQuickBet={() => setPendingQuickBet(null)}
          onBalanceChange={() => fetchUserBalance(currentUser.cedula)}
        />
      ) : currentView === 'wallet' && !isAdmin ? (
        <WalletPanel
          user={currentUser}
          initialSection={walletSection}
          onBalanceChange={() => fetchUserBalance(currentUser.cedula)}
        />
      ) : isAdmin ? (
        <div className="flex-1 flex flex-col items-center justify-start py-10 px-4 sm:px-6 lg:px-8">
          <header className="text-center max-w-xl mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
              Gestión de <span className="text-apuestax-neon">Usuarios</span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Control de cuentas, roles de acceso, empresas operadoras y auditoría en{' '}
              <span className="font-semibold text-slate-200">Apuestax</span>.
            </p>
          </header>

          <main className="w-full max-w-5xl">
            <UserList />
          </main>

          <footer className="mt-16 text-center text-xs text-slate-500">
            <p>© 2026 Apuestax. Todos los derechos reservados.</p>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

export default App;
