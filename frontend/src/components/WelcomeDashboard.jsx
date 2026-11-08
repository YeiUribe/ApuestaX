import { useState, useEffect } from 'react';
import { getUsers, getMatches, getAllOdds } from '../services/userService';
import TeamShield from './TeamShield';

const FALLBACK_HOME_MATCHES = [
  {
    codigo_partido: 'MIL-AME-F2',
    equipo_local: 'Millonarios FC',
    equipo_visitante: 'América de Cali',
    nombre_jornada: 'Fecha 2',
    ciudad: 'Bogotá',
    estado_partido: 'En Vivo',
    goles_local: 2,
    goles_visitante: 1,
    hora: 'En Vivo • 68\'',
    cuotas: { local: '1.97', empate: '3.45', visitante: '4.20', mas25: '1.85', ambos: '1.78', mercados: 137 },
  },
  {
    codigo_partido: 'ONC-NAL-F2',
    equipo_local: 'Once Caldas',
    equipo_visitante: 'Atlético Nacional',
    nombre_jornada: 'Fecha 2',
    ciudad: 'Manizales',
    estado_partido: 'En Vivo',
    goles_local: 1,
    goles_visitante: 1,
    hora: 'En Vivo • 54\'',
    cuotas: { local: '2.60', empate: '3.00', visitante: '2.45', mas25: '1.81', ambos: '1.72', mercados: 150 },
  },
  {
    codigo_partido: 'MED-CAL-F2',
    equipo_local: 'Independiente Medellín',
    equipo_visitante: 'Deportivo Cali',
    nombre_jornada: 'Fecha 2',
    ciudad: 'Medellín',
    estado_partido: 'En Vivo',
    goles_local: 2,
    goles_visitante: 2,
    hora: 'En Vivo • 72\'',
    cuotas: { local: '1.85', empate: '3.40', visitante: '4.10', mas25: '1.88', ambos: '1.65', mercados: 127 },
  },
  {
    codigo_partido: 'SFE-TOL-F2',
    equipo_local: 'Independiente Santa Fe',
    equipo_visitante: 'Deportes Tolima',
    nombre_jornada: 'Fecha 2',
    ciudad: 'Bogotá',
    estado_partido: 'En Vivo',
    goles_local: 1,
    goles_visitante: 0,
    hora: 'En Vivo • 39\'',
    cuotas: { local: '2.15', empate: '3.10', visitante: '3.35', mas25: '1.90', ambos: '1.82', mercados: 118 },
  },
  {
    codigo_partido: 'JUN-ONC-F3',
    equipo_local: 'Junior de Barranquilla',
    equipo_visitante: 'Once Caldas',
    nombre_jornada: 'Fecha 3',
    ciudad: 'Barranquilla',
    estado_partido: 'Programado',
    goles_local: 0,
    goles_visitante: 0,
    hora: '6:30 p. m.',
    cuotas: { local: '1.75', empate: '3.30', visitante: '4.50', mas25: '1.95', ambos: '1.86', mercados: 116 },
  },
  {
    codigo_partido: 'BUC-PER-F3',
    equipo_local: 'Atlético Bucaramanga',
    equipo_visitante: 'Deportivo Pereira',
    nombre_jornada: 'Fecha 3',
    ciudad: 'Bucaramanga',
    estado_partido: 'Programado',
    goles_local: 0,
    goles_visitante: 0,
    hora: '8:15 p. m.',
    cuotas: { local: '2.05', empate: '3.15', visitante: '3.60', mas25: '1.92', ambos: '1.80', mercados: 109 },
  },
  {
    codigo_partido: 'CUC-SFE-F3',
    equipo_local: 'Cúcuta Deportivo',
    equipo_visitante: 'Independiente Santa Fe',
    nombre_jornada: 'Fecha 3',
    ciudad: 'Cúcuta',
    estado_partido: 'Programado',
    goles_local: 0,
    goles_visitante: 0,
    hora: '4:00 p. m.',
    cuotas: { local: '3.10', empate: '3.40', visitante: '2.30', mas25: '1.85', ambos: '1.79', mercados: 116 },
  },
  {
    codigo_partido: 'FOR-MED-F3',
    equipo_local: 'Fortaleza FC',
    equipo_visitante: 'Independiente Medellín',
    nombre_jornada: 'Fecha 3',
    ciudad: 'Bogotá',
    estado_partido: 'Programado',
    goles_local: 0,
    goles_visitante: 0,
    hora: '6:10 p. m.',
    cuotas: { local: '3.45', empate: '3.60', visitante: '2.14', mas25: '1.89', ambos: '1.84', mercados: 127 },
  },
  {
    codigo_partido: 'NAL-AGU-F4',
    equipo_local: 'Atlético Nacional',
    equipo_visitante: 'Águilas Doradas Rionegro',
    nombre_jornada: 'Fecha 4',
    ciudad: 'Medellín',
    estado_partido: 'Programado',
    goles_local: 0,
    goles_visitante: 0,
    hora: '8:00 p. m.',
    cuotas: { local: '1.55', empate: '3.80', visitante: '5.40', mas25: '1.81', ambos: '1.92', mercados: 150 },
  },
];

const PROMOCIONES_DESTACADAS = [
  {
    id: 'PROMO-WOMPI-100',
    badge: 'BONO +100% EN RECARGAS',
    titulo: 'Duplica tu Recarga con Wompi / PSE',
    descripcion: 'Recarga desde $20.000 COP y recibe el 100% adicional en Bono Activo hasta $250.000 COP.',
    codigo: 'WOMPI100',
    accion: 'Recargar y Activar',
    destino: 'recarga',
  },
  {
    id: 'PROMO-CASHBACK-20',
    badge: '20% DESCUENTO / CASHBACK',
    titulo: 'Apuesta Seguro en Liga BetPlay',
    descripcion: 'Te devolvemos el 20% de tus combinadas de 3 o más partidos si fallas por un solo marcador.',
    codigo: 'BETPLAY20',
    accion: 'Redimir Promoción',
    destino: 'promocion',
  },
  {
    id: 'PROMO-CUOTA-VIP',
    badge: 'SUPER CUOTAS +25%',
    titulo: 'Potenciador de Ganancias en Vivo',
    descripcion: 'Obtén un 25% extra de ganancia neta apostando en los clásicos en vivo de esta fecha.',
    codigo: 'SUPERCUOTA',
    accion: 'Ver Partidos en Vivo',
    destino: 'partidos',
  },
];

function WelcomeDashboard({ user, onViewMatches, onSelectQuickBet, onViewWallet }) {
  const displayName = user?.nombre || 'Usuario';
  const isAdmin = user?.nombre_rol === 'Administrador';

  const handleQuickMarketClick = (match, marketName, oddValue) => {
    if (onSelectQuickBet) {
      onSelectQuickBet(match, marketName, Number(oddValue));
    } else if (onViewMatches) {
      onViewMatches();
    }
  };

  const [totalUsersCount, setTotalUsersCount] = useState(5);
  const [totalMatchesCount, setTotalMatchesCount] = useState(5);
  const [liveMatches, setLiveMatches] = useState(FALLBACK_HOME_MATCHES);

  // Contadores dinámicos de pozo acumulado para que se vea vivo como en BetPlay
  const [megaJackpot, setMegaJackpot] = useState(271176173);
  const [superJackpot, setSuperJackpot] = useState(7115208);

  useEffect(() => {
    const interval = setInterval(() => {
      setMegaJackpot((prev) => prev + Math.floor(Math.random() * 45) + 12);
      setSuperJackpot((prev) => prev + Math.floor(Math.random() * 15) + 3);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [matchesRes, oddsRes] = await Promise.allSettled([getMatches(), getAllOdds()]);
        if (!mounted) return;

        const oddsList =
          oddsRes.status === 'fulfilled' && Array.isArray(oddsRes.value) ? oddsRes.value : [];
        const oddsByMatch = {};
        oddsList.forEach((o) => {
          if (!oddsByMatch[o.codigo_partido]) oddsByMatch[o.codigo_partido] = {};
          oddsByMatch[o.codigo_partido][o.nombre_mercado] = Number(o.multiplicador_fijado);
        });

        if (
          matchesRes.status === 'fulfilled' &&
          Array.isArray(matchesRes.value) &&
          matchesRes.value.length > 0
        ) {
          const allMatches = matchesRes.value;
          setTotalMatchesCount(allMatches.length);

          // Ordenar: primero 'En Vivo', luego 'Programado', y al final 'Finalizado'
          const sorted = [...allMatches].sort((a, b) => {
            const rank = (s) => (s === 'En Vivo' ? 0 : s === 'Programado' ? 1 : 2);
            return rank(a.estado_partido) - rank(b.estado_partido);
          });

          const mapped = sorted
            .filter((m) => m.estado_partido !== 'Finalizado')
            .map((m, idx) => {
              const fb = FALLBACK_HOME_MATCHES[idx % FALLBACK_HOME_MATCHES.length];
              const mOdds = oddsByMatch[m.codigo_partido] || {};
              const cLocal = mOdds['Gana Local'] || fb.cuotas.local;
              const cEmpate = mOdds['Empate'] || fb.cuotas.empate;
              const cVisita = mOdds['Gana Visitante'] || fb.cuotas.visitante;
              const cMas25 = mOdds['Más de 2.5 Goles'] || fb.cuotas.mas25;
              const cAmbos = mOdds['Ambos Marcan'] || mOdds['Ambos Equipos Anotan'] || fb.cuotas.ambos;

              return {
                codigo_partido: m.codigo_partido,
                equipo_local: m.equipo_local,
                equipo_visitante: m.equipo_visitante,
                nombre_jornada: m.nombre_jornada || 'Liga BetPlay',
                ciudad: m.ciudad || '',
                nombre_estadio: m.nombre_estadio || '',
                estado_partido: m.estado_partido,
                goles_local: m.marcador_local ?? m.goles_local ?? 0,
                goles_visitante: m.marcador_visitante ?? m.goles_visitante ?? 0,
                hora:
                  m.estado_partido === 'En Vivo'
                    ? 'En Vivo'
                    : new Date(m.fecha_hora || m.fecha_programada).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                cuotas: {
                  local: Number(cLocal).toFixed(2),
                  empate: Number(cEmpate).toFixed(2),
                  visitante: Number(cVisita).toFixed(2),
                  mas25: Number(cMas25).toFixed(2),
                  ambos: Number(cAmbos).toFixed(2),
                  mercados: fb.cuotas.mercados,
                },
              };
            });
          setLiveMatches(mapped);
        }

        if (isAdmin) {
          const usersRes = await getUsers();
          if (mounted && Array.isArray(usersRes)) {
            setTotalUsersCount(usersRes.length);
          }
        }
      } catch {
        // Usa datos de respaldo
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  // Tarjetas superiores:
  // - Para Usuario: Jackpots acumulados y Bono de Recarga / Descuento (sin mostrar "Modo Usuario" ni "Historial")
  // - Para Administrador: Resumen de Consola
  const topCards = isAdmin
    ? [
        {
          title: 'CUENTAS REGISTRADAS',
          value: String(totalUsersCount),
          subtitle: 'Usuarios activos en la plataforma',
        },
        {
          title: 'PARTIDOS LIGA BETPLAY',
          value: String(totalMatchesCount),
          subtitle: 'Encuentros bajo control en consola',
        },
        {
          title: 'MODO DE OPERACIÓN',
          value: 'Consola Admin',
          subtitle: 'Gestión general y auditoría activa',
        },
      ]
    : [
        {
          title: 'MEGA',
          value: `$${megaJackpot.toLocaleString('es-CO')}`,
          subtitle: 'Gana hasta 500 millones',
        },
        {
          title: 'SUPER',
          value: `$${superJackpot.toLocaleString('es-CO')}`,
          subtitle: 'Gana hasta $ 50 millones',
        },
        {
          title: 'BONO +100%',
          value: '$250.000 COP',
          subtitle: 'Duplica tu recarga y 20% de descuento en combinadas',
        },
      ];

  return (
    <main className="flex-1 bg-slate-950 text-white px-3 py-5 sm:px-6 lg:px-8 sm:py-8">
      <div className="w-full max-w-7xl mx-auto space-y-7 sm:space-y-10">
        {/* Encabezado para Administrador */}
        {isAdmin && (
          <header className="text-center sm:text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#39FF14]">
              Apuestax • Consola Central de Administración
            </p>
            <h1 className="text-2xl font-bold leading-tight sm:text-4xl">
              ¡Hola, {displayName}! Panel de Control Apuesta<span className="text-[#39FF14]">X</span>
            </h1>
            <p className="mt-2 text-xs text-slate-400 sm:text-base">
              Administra las cuentas de usuario, supervisa la auditoría del sistema y controla los marcadores en vivo.
            </p>
          </header>
        )}

        {/* 3 CARDS PRINCIPALES (CON COLORES DE MARCA #0b132b + #39FF14 Y MARCA DE AGUA APUESTAX) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5" aria-label="Pozos y Promociones">
          {topCards.map((card) => (
            <article
              key={card.title}
              onClick={() => {
                if (!isAdmin) {
                  if (card.title.includes('BONO')) {
                    onViewWallet('promocion');
                  } else {
                    onViewMatches();
                  }
                }
              }}
              className="relative overflow-hidden rounded-2xl sm:rounded-[24px] bg-[#0b132b] border border-slate-800/80 px-5 py-4 sm:px-7 sm:py-6 shadow-2xl shadow-black/60 transition-transform duration-300 hover:-translate-y-1 group cursor-pointer"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <h2 className="text-sm sm:text-xl font-extrabold uppercase tracking-wide text-[#39FF14]">
                  {card.title}
                </h2>

                <p className="mt-1.5 sm:mt-2.5 mb-1 text-2xl sm:text-4xl font-black tracking-tight text-[#39FF14]">
                  {card.value}
                </p>

                <span className="text-xs sm:text-sm font-bold text-[#39FF14]/90">
                  {card.subtitle}
                </span>
              </div>

              {/* Marca de agua del Logo ApuestaX en la esquina inferior derecha */}
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute -bottom-7 -right-5 w-36 h-36 opacity-[0.08] group-hover:opacity-[0.14] transition-opacity duration-300 -rotate-12"
              >
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <rect
                    x="10"
                    y="10"
                    width="100"
                    height="100"
                    rx="24"
                    stroke="#39FF14"
                    strokeWidth="8"
                  />
                  <text
                    x="60"
                    y="84"
                    textAnchor="middle"
                    fill="#39FF14"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="900"
                    fontSize="68"
                  >
                    A
                  </text>
                </svg>
              </div>
            </article>
          ))}
        </section>

        {/* SI ES ADMINISTRADOR: Botones de Consola */}
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onViewWallet('users')}
              className="rounded-xl bg-[#39FF14] px-6 py-3 font-bold text-slate-950 shadow-lg shadow-[#39FF14]/20 transition hover:brightness-110 cursor-pointer"
            >
              Ir a Gestión de Usuarios y Auditoría
            </button>
            <button
              type="button"
              onClick={onViewMatches}
              className="rounded-xl bg-slate-900 border border-slate-700 hover:border-[#39FF14] px-6 py-3 font-bold text-slate-200 hover:text-[#39FF14] transition cursor-pointer"
            >
              Controlar Partidos en Vivo
            </button>
          </div>
        ) : (
          <>
            {/* SECCIÓN DE PROMOCIONES Y DESCUENTOS LLAMATIVOS */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#39FF14] animate-pulse" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Promociones y Descuentos Exclusivos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onViewWallet('promocion')}
                  className="text-xs font-extrabold text-[#39FF14] hover:underline cursor-pointer"
                >
                  Tengo un código promocional →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PROMOCIONES_DESTACADAS.map((promo) => (
                  <div
                    key={promo.id}
                    className="rounded-2xl bg-gradient-to-br from-[#0b132b] via-slate-900 to-slate-950 border border-slate-800 hover:border-[#39FF14]/50 p-5 flex flex-col justify-between gap-4 shadow-xl transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14] text-[10px] font-black uppercase tracking-wider">
                          {promo.badge}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          Cód: <strong className="text-white">{promo.codigo}</strong>
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white">{promo.titulo}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{promo.descripcion}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (promo.destino === 'partidos') {
                          onViewMatches();
                        } else {
                          onViewWallet(promo.destino);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#39FF14]/15 hover:bg-[#39FF14] text-[#39FF14] hover:text-slate-950 border border-[#39FF14]/40 font-extrabold text-xs transition cursor-pointer"
                    >
                      {promo.accion}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* SECCIÓN FÚTBOL • LIGA BETPLAY DIMAYOR (IDÉNTICA AL LAYOUT DE LA IMAGEN) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">Fútbol</h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-bold text-[#39FF14]">
                    Liga BetPlay Dimayor
                  </span>
                </div>

                <div className="hidden lg:grid grid-cols-5 gap-2 w-[540px] text-center text-[11px] font-bold uppercase text-slate-400 pr-24">
                  <span>1 (Local)</span>
                  <span>X (Empate)</span>
                  <span>2 (Visita)</span>
                  <span>+2.5 Goles</span>
                  <span>Ambos Marcan</span>
                </div>
              </div>

              <div className="divide-y divide-slate-800/80 rounded-2xl bg-[#050b1a] border border-slate-800/90 overflow-hidden shadow-2xl">
                {liveMatches.map((match) => (
                  <div
                    key={match.codigo_partido}
                    className="p-3.5 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 hover:bg-slate-900/50 transition"
                  >
                    {/* Hora / Estado y Equipos con Escudos Oficiales */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      <div className="flex items-center justify-between sm:block sm:w-24 shrink-0 text-left">
                        {match.estado_partido === 'En Vivo' ? (
                          <div className="flex items-center sm:block gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 text-[11px] font-extrabold">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              EN VIVO
                            </span>
                            {match.ciudad && (
                              <span className="text-[11px] sm:text-[10px] text-slate-400 sm:block sm:mt-1 truncate">
                                {match.ciudad}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center sm:block gap-2">
                            <span className="text-xs text-slate-300 font-bold sm:block">
                              {match.hora}
                            </span>
                            <span className="text-[11px] sm:text-[10px] text-slate-500 sm:block">
                              {match.nombre_jornada || 'Programado'}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={onViewMatches}
                          className="sm:hidden text-[11px] font-bold text-[#39FF14] hover:underline cursor-pointer"
                        >
                          +{match.cuotas.mercados} mercados →
                        </button>
                      </div>

                      <div className="space-y-2 min-w-0 flex-1 sm:pr-3">
                        {/* Equipo Local */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <TeamShield teamName={match.equipo_local} size="md" />
                            <span className="text-sm font-extrabold text-white truncate">
                              {match.equipo_local}
                            </span>
                          </div>
                          {match.estado_partido === 'En Vivo' && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-black text-sm text-[#39FF14]">
                              {match.goles_local}
                            </span>
                          )}
                        </div>

                        {/* Equipo Visitante */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <TeamShield teamName={match.equipo_visitante} size="md" />
                            <span className="text-sm font-extrabold text-white truncate">
                              {match.equipo_visitante}
                            </span>
                          </div>
                          {match.estado_partido === 'En Vivo' && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-black text-sm text-[#39FF14]">
                              {match.goles_visitante}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de Cuotas estilo BetPlay (1 - X - 2 - Más de 2.5 - Ambos Marcan) 100% Responsivos y Conectados al Cupón */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 w-full lg:w-[520px]">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickMarketClick(match, 'Gana Local', match.cuotas.local)
                          }
                          className="h-12 sm:h-14 rounded-lg bg-[#0d1b3e] hover:bg-[#162a5c] active:bg-[#39FF14] active:text-slate-950 border border-slate-800 hover:border-[#39FF14] flex flex-col items-center justify-center transition cursor-pointer"
                        >
                          <span className="text-[10px] text-slate-400 lg:hidden">1 (Local)</span>
                          <span className="text-xs font-extrabold text-white">
                            {match.cuotas.local}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuickMarketClick(match, 'Empate', match.cuotas.empate)
                          }
                          className="h-12 sm:h-14 rounded-lg bg-[#0d1b3e] hover:bg-[#162a5c] active:bg-[#39FF14] active:text-slate-950 border border-slate-800 hover:border-[#39FF14] flex flex-col items-center justify-center transition cursor-pointer"
                        >
                          <span className="text-[10px] text-slate-400 lg:hidden">X (Empate)</span>
                          <span className="text-xs font-extrabold text-white">
                            {match.cuotas.empate}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuickMarketClick(match, 'Gana Visitante', match.cuotas.visitante)
                          }
                          className="h-12 sm:h-14 rounded-lg bg-[#0d1b3e] hover:bg-[#162a5c] active:bg-[#39FF14] active:text-slate-950 border border-slate-800 hover:border-[#39FF14] flex flex-col items-center justify-center transition cursor-pointer"
                        >
                          <span className="text-[10px] text-slate-400 lg:hidden">2 (Visita)</span>
                          <span className="text-xs font-extrabold text-white">
                            {match.cuotas.visitante}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuickMarketClick(match, 'Más de 2.5 Goles', match.cuotas.mas25)
                          }
                          className="col-span-1 h-12 sm:h-14 rounded-lg bg-[#0d1b3e] hover:bg-[#162a5c] active:bg-[#39FF14] active:text-slate-950 border border-slate-800 hover:border-[#39FF14] flex flex-col items-center justify-center transition cursor-pointer"
                        >
                          <span className="text-[10px] sm:text-[11px] text-slate-300">+2.5 Goles</span>
                          <span className="text-xs font-extrabold text-white">
                            {match.cuotas.mas25}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuickMarketClick(match, 'Ambos Marcan', match.cuotas.ambos)
                          }
                          className="col-span-2 sm:col-span-1 h-12 sm:h-14 rounded-lg bg-[#0d1b3e] hover:bg-[#162a5c] active:bg-[#39FF14] active:text-slate-950 border border-slate-800 hover:border-[#39FF14] flex flex-col items-center justify-center transition cursor-pointer"
                        >
                          <span className="text-[10px] sm:text-[11px] text-slate-300">Ambos Marcan</span>
                          <span className="text-xs font-extrabold text-white">
                            {match.cuotas.ambos}
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onViewMatches}
                        className="hidden sm:block w-20 text-left pl-2 text-xs font-bold text-slate-300 hover:text-[#39FF14] transition cursor-pointer shrink-0"
                      >
                        {match.cuotas.mercados} Más
                        <span className="block text-[11px] font-normal text-slate-400">
                          Apuestas
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default WelcomeDashboard;
