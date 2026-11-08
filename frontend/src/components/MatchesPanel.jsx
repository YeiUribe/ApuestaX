import { useState, useEffect } from 'react';
import TeamShield from './TeamShield';
import {
  getLeagues,
  getMatches,
  getMatchDetails,
  getPlayers,
  getAllOdds,
  getWallet,
  createTicket,
  getUserTickets,
  updateLiveMatch,
  simulateLiveMatches,
} from '../services/userService';

const FALLBACK_LEAGUES = [
  { codigo_torneo: 'LIGA-2026-II', nombre_torneo: 'Liga BetPlay Dimayor', año: 2026 },
];

const FALLBACK_MATCHES = [
  {
    codigo_partido: 'ONC-NAL-F2',
    codigo_jornada: '2026-II-FECHA2',
    nombre_jornada: 'Fecha 2',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Once Caldas',
    equipo_visitante: 'Atlético Nacional',
    nombre_estadio: 'Palogrande',
    ciudad: 'Manizales',
    fecha_hora: '2026-08-09T16:00:00',
    marcador_local: 1,
    marcador_visitante: 1,
    estado_partido: 'En Vivo',
    arbitro: 'Bismarks Santiago',
    dt_local: 'Hernán Darío Herrera',
    dt_visitante: 'Lucas González',
  },
  {
    codigo_partido: 'MIL-AME-F2',
    codigo_jornada: '2026-II-FECHA2',
    nombre_jornada: 'Fecha 2',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Millonarios FC',
    equipo_visitante: 'América de Cali',
    nombre_estadio: 'Nemesio Camacho El Campín',
    ciudad: 'Bogotá',
    fecha_hora: '2026-08-10T20:00:00',
    marcador_local: 2,
    marcador_visitante: 1,
    estado_partido: 'En Vivo',
    arbitro: 'Nicolás Gallo',
    dt_local: 'Alberto Gamero',
    dt_visitante: 'David González',
  },
  {
    codigo_partido: 'MED-CAL-F2',
    codigo_jornada: '2026-II-FECHA2',
    nombre_jornada: 'Fecha 2',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Independiente Medellín',
    equipo_visitante: 'Deportivo Cali',
    nombre_estadio: 'Atanasio Girardot',
    ciudad: 'Medellín',
    fecha_hora: '2026-08-10T18:10:00',
    marcador_local: 2,
    marcador_visitante: 2,
    estado_partido: 'En Vivo',
    arbitro: 'Wilmar Roldán',
    dt_local: 'Luis Amaranto Perea',
    dt_visitante: 'Rafael Dudamel',
  },
  {
    codigo_partido: 'SFE-TOL-F2',
    codigo_jornada: '2026-II-FECHA2',
    nombre_jornada: 'Fecha 2',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Independiente Santa Fe',
    equipo_visitante: 'Deportes Tolima',
    nombre_estadio: 'Nemesio Camacho El Campín',
    ciudad: 'Bogotá',
    fecha_hora: '2026-08-10T19:30:00',
    marcador_local: 1,
    marcador_visitante: 0,
    estado_partido: 'En Vivo',
    arbitro: 'Carlos Betancur',
    dt_local: 'Pablo Repetto',
    dt_visitante: 'Luis Fernando Suárez',
  },
  {
    codigo_partido: 'JUN-ONC-F3',
    codigo_jornada: '2026-II-FECHA3',
    nombre_jornada: 'Fecha 3',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Junior de Barranquilla',
    equipo_visitante: 'Once Caldas',
    nombre_estadio: 'Metropolitano Roberto Meléndez',
    ciudad: 'Barranquilla',
    fecha_hora: '2026-08-16T18:30:00',
    marcador_local: 0,
    marcador_visitante: 0,
    estado_partido: 'Programado',
    arbitro: 'Jhon Hinestroza',
    dt_local: 'Sebastián Viera',
    dt_visitante: 'Hernán Darío Herrera',
  },
  {
    codigo_partido: 'BUC-PER-F3',
    codigo_jornada: '2026-II-FECHA3',
    nombre_jornada: 'Fecha 3',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Atlético Bucaramanga',
    equipo_visitante: 'Deportivo Pereira',
    nombre_estadio: 'Américo Montanini',
    ciudad: 'Bucaramanga',
    fecha_hora: '2026-08-16T20:15:00',
    marcador_local: 0,
    marcador_visitante: 0,
    estado_partido: 'Programado',
    arbitro: 'Bismarks Santiago',
    dt_local: 'Pablo Peirano',
    dt_visitante: 'Alexis Márquez',
  },
  {
    codigo_partido: 'CUC-SFE-F3',
    codigo_jornada: '2026-II-FECHA3',
    nombre_jornada: 'Fecha 3',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Cúcuta Deportivo',
    equipo_visitante: 'Independiente Santa Fe',
    nombre_estadio: 'General Santander',
    ciudad: 'Cúcuta',
    fecha_hora: '2026-08-17T16:00:00',
    marcador_local: 0,
    marcador_visitante: 0,
    estado_partido: 'Programado',
    arbitro: 'Nicolás Gallo',
    dt_local: 'Nicolás Chiesa',
    dt_visitante: 'Pablo Repetto',
  },
  {
    codigo_partido: 'FOR-MED-F3',
    codigo_jornada: '2026-II-FECHA3',
    nombre_jornada: 'Fecha 3',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Fortaleza FC',
    equipo_visitante: 'Independiente Medellín',
    nombre_estadio: 'Metropolitano de Techo',
    ciudad: 'Bogotá',
    fecha_hora: '2026-08-17T18:10:00',
    marcador_local: 0,
    marcador_visitante: 0,
    estado_partido: 'Programado',
    arbitro: 'Wilmar Roldán',
    dt_local: 'Diego Arias',
    dt_visitante: 'Luis Amaranto Perea',
  },
  {
    codigo_partido: 'NAL-AGU-F4',
    codigo_jornada: '2026-II-FECHA4',
    nombre_jornada: 'Fecha 4',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Atlético Nacional',
    equipo_visitante: 'Águilas Doradas Rionegro',
    nombre_estadio: 'Atanasio Girardot',
    ciudad: 'Medellín',
    fecha_hora: '2026-08-22T20:00:00',
    marcador_local: 0,
    marcador_visitante: 0,
    estado_partido: 'Programado',
    arbitro: 'Carlos Betancur',
    dt_local: 'Lucas González',
    dt_visitante: 'Flavio Robatto',
  },
  {
    codigo_partido: 'NAL-MIL-F1',
    codigo_jornada: '2026-II-FECHA1',
    nombre_jornada: 'Fecha 1',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'Atlético Nacional',
    equipo_visitante: 'Millonarios FC',
    nombre_estadio: 'Atanasio Girardot',
    ciudad: 'Medellín',
    fecha_hora: '2026-08-02T20:00:00',
    marcador_local: 1,
    marcador_visitante: 1,
    estado_partido: 'Finalizado',
    arbitro: 'Wilmar Roldán',
    dt_local: 'Lucas González',
    dt_visitante: 'Alberto Gamero',
  },
  {
    codigo_partido: 'AME-JUN-F1',
    codigo_jornada: '2026-II-FECHA1',
    nombre_jornada: 'Fecha 1',
    codigo_torneo: 'LIGA-2026-II',
    nombre_torneo: 'Liga BetPlay Dimayor',
    equipo_local: 'América de Cali',
    equipo_visitante: 'Junior de Barranquilla',
    nombre_estadio: 'Pascual Guerrero',
    ciudad: 'Cali',
    fecha_hora: '2026-08-03T18:00:00',
    marcador_local: 2,
    marcador_visitante: 0,
    estado_partido: 'Finalizado',
    arbitro: 'Carlos Betancur',
    dt_local: 'David González',
    dt_visitante: 'Sebastián Viera',
  },
];

const FALLBACK_ODDS = [
  { codigo_partido: 'NAL-MIL-F1', nombre_mercado: 'Gana Local', multiplicador_fijado: 2.1 },
  { codigo_partido: 'NAL-MIL-F1', nombre_mercado: 'Empate', multiplicador_fijado: 3.1 },
  { codigo_partido: 'NAL-MIL-F1', nombre_mercado: 'Gana Visitante', multiplicador_fijado: 3.4 },
  { codigo_partido: 'AME-JUN-F1', nombre_mercado: 'Gana Local', multiplicador_fijado: 1.8 },
  { codigo_partido: 'AME-JUN-F1', nombre_mercado: 'Empate', multiplicador_fijado: 3.25 },
  { codigo_partido: 'AME-JUN-F1', nombre_mercado: 'Gana Visitante', multiplicador_fijado: 4.1 },
  { codigo_partido: 'ONC-NAL-F2', nombre_mercado: 'Gana Local', multiplicador_fijado: 2.6 },
  { codigo_partido: 'ONC-NAL-F2', nombre_mercado: 'Empate', multiplicador_fijado: 3.0 },
  { codigo_partido: 'ONC-NAL-F2', nombre_mercado: 'Gana Visitante', multiplicador_fijado: 2.45 },
  { codigo_partido: 'MIL-AME-F2', nombre_mercado: 'Gana Local', multiplicador_fijado: 1.9 },
  { codigo_partido: 'MIL-AME-F2', nombre_mercado: 'Empate', multiplicador_fijado: 3.2 },
  { codigo_partido: 'MIL-AME-F2', nombre_mercado: 'Gana Visitante', multiplicador_fijado: 3.8 },
  { codigo_partido: 'JUN-ONC-F3', nombre_mercado: 'Gana Local', multiplicador_fijado: 1.75 },
  { codigo_partido: 'JUN-ONC-F3', nombre_mercado: 'Empate', multiplicador_fijado: 3.3 },
  { codigo_partido: 'JUN-ONC-F3', nombre_mercado: 'Gana Visitante', multiplicador_fijado: 4.5 },
];

const FALLBACK_DETAILS = {
  'NAL-MIL-F1': {
    alineaciones: [
      { documento_jugador: 'JUG001', nombre_jugador: 'Harlen Castillo', nombre_equipo: 'Atlético Nacional', posicion_habitual: 'Portero', es_titular: 1 },
      { documento_jugador: 'JUG002', nombre_jugador: 'Alvaro Montero', nombre_equipo: 'Millonarios FC', posicion_habitual: 'Portero', es_titular: 1 },
    ],
    eventos: [
      { minuto_ocurrencia: 15, documento_jugador: 'JUG001', nombre_jugador: 'Harlen Castillo', nombre_equipo: 'Atlético Nacional', nombre_evento: 'Tarjeta Amarilla' },
      { minuto_ocurrencia: 45, documento_jugador: 'JUG002', nombre_jugador: 'Alvaro Montero', nombre_equipo: 'Millonarios FC', nombre_evento: 'Gol' },
    ],
  },
  'AME-JUN-F1': {
    alineaciones: [
      { documento_jugador: 'JUG003', nombre_jugador: 'Adrian Ramos', nombre_equipo: 'América de Cali', posicion_habitual: 'Delantero', es_titular: 1 },
      { documento_jugador: 'JUG004', nombre_jugador: 'Carlos Bacca', nombre_equipo: 'Junior de Barranquilla', posicion_habitual: 'Delantero', es_titular: 1 },
    ],
    eventos: [
      { minuto_ocurrencia: 30, documento_jugador: 'JUG003', nombre_jugador: 'Adrian Ramos', nombre_equipo: 'América de Cali', nombre_evento: 'Gol' },
      { minuto_ocurrencia: 75, documento_jugador: 'JUG004', nombre_jugador: 'Carlos Bacca', nombre_equipo: 'Junior de Barranquilla', nombre_evento: 'Tarjeta Amarilla' },
    ],
  },
  'ONC-NAL-F2': {
    alineaciones: [
      { documento_jugador: 'JUG005', nombre_jugador: 'Dayro Moreno', nombre_equipo: 'Once Caldas', posicion_habitual: 'Delantero', es_titular: 1 },
    ],
    eventos: [],
  },
};

const BANCOS_PSE = ['Bancolombia', 'Nequi', 'Davivienda', 'Banco de Bogotá', 'DaviPlata'];

// Colores e iniciales de escudo por club de la Liga BetPlay Dimayor
const TEAM_STYLES = {
  'Atlético Nacional': { primary: '#16a34a', secondary: '#ffffff', short: 'Nacional', badge: 'ATN' },
  'Millonarios FC': { primary: '#1d4ed8', secondary: '#ffffff', short: 'Millonarios', badge: 'MIL' },
  'América de Cali': { primary: '#dc2626', secondary: '#ffffff', short: 'América', badge: 'AME' },
  'Junior de Barranquilla': { primary: '#dc2626', secondary: '#1e3a8a', short: 'Junior', badge: 'JUN' },
  'Once Caldas': { primary: '#f8fafc', secondary: '#0f172a', short: 'Once Caldas', badge: 'ONC' },
  'Independiente Santa Fe': { primary: '#dc2626', secondary: '#ffffff', short: 'Santa Fe', badge: 'SFE' },
  'Independiente Medellín': { primary: '#dc2626', secondary: '#1d4ed8', short: 'Medellín', badge: 'DIM' },
  'Deportivo Cali': { primary: '#15803d', secondary: '#ffffff', short: 'Dep. Cali', badge: 'CAL' },
  'Deportes Tolima': { primary: '#7f1d1d', secondary: '#eab308', short: 'Tolima', badge: 'TOL' },
  'Atlético Bucaramanga': { primary: '#facc15', secondary: '#15803d', short: 'Bucaramanga', badge: 'BUC' },
  'Deportivo Pereira': { primary: '#dc2626', secondary: '#facc15', short: 'Pereira', badge: 'PER' },
  'Deportivo Pasto': { primary: '#1d4ed8', secondary: '#dc2626', short: 'Pasto', badge: 'PAS' },
  'Cúcuta Deportivo': { primary: '#dc2626', secondary: '#0f172a', short: 'Cúcuta', badge: 'CUC' },
  'Boyacá Chicó': { primary: '#1e3a8a', secondary: '#15803d', short: 'Boy. Chicó', badge: 'CHI' },
  'Fortaleza FC': { primary: '#0f172a', secondary: '#dc2626', short: 'Fortaleza', badge: 'FOR' },
  'Águilas Doradas Rionegro': { primary: '#eab308', secondary: '#ffffff', short: 'Águilas', badge: 'AGU' },
};

// Barras de probabilidad (8 barras) y puntos de tendencia por partido
const MATCH_ANALYTICS = {
  'ONC-NAL-F2': {
    bars: [32, 58, 92, 68, 45, 22, 12, 6],
    trend: 'M0,22 L18,19 L36,12 L54,16 L72,8 L90,13 L110,6',
  },
  'MIL-AME-F2': {
    bars: [28, 62, 95, 74, 50, 26, 10, 5],
    trend: 'M0,24 L18,18 L36,20 L54,10 L72,14 L90,6 L110,9',
  },
  'MED-CAL-F2': {
    bars: [35, 68, 94, 72, 48, 24, 14, 7],
    trend: 'M0,21 L18,16 L36,18 L54,11 L72,9 L90,12 L110,5',
  },
  'SFE-TOL-F2': {
    bars: [30, 55, 89, 66, 44, 21, 11, 5],
    trend: 'M0,23 L18,20 L36,14 L54,15 L72,10 L90,8 L110,7',
  },
  'JUN-ONC-F3': {
    bars: [36, 65, 88, 60, 38, 20, 9, 4],
    trend: 'M0,20 L18,15 L36,11 L54,14 L72,9 L90,11 L110,5',
  },
  'BUC-PER-F3': {
    bars: [29, 59, 91, 65, 43, 22, 11, 6],
    trend: 'M0,22 L18,17 L36,15 L54,12 L72,14 L90,9 L110,6',
  },
  'CUC-SFE-F3': {
    bars: [25, 52, 86, 70, 49, 25, 13, 6],
    trend: 'M0,24 L18,21 L36,16 L54,13 L72,11 L90,14 L110,8',
  },
  'FOR-MED-F3': {
    bars: [24, 50, 84, 72, 52, 28, 14, 7],
    trend: 'M0,25 L18,19 L36,17 L54,12 L72,15 L90,10 L110,7',
  },
  'NAL-AGU-F4': {
    bars: [42, 74, 96, 62, 38, 18, 8, 4],
    trend: 'M0,23 L18,16 L36,11 L54,9 L72,12 L90,6 L110,4',
  },
  'NAL-MIL-F1': {
    bars: [30, 54, 90, 64, 42, 24, 11, 5],
    trend: 'M0,21 L18,17 L36,13 L54,15 L72,10 L90,12 L110,8',
  },
  'AME-JUN-F1': {
    bars: [34, 60, 94, 70, 46, 21, 10, 4],
    trend: 'M0,23 L18,19 L36,14 L54,11 L72,15 L90,7 L110,6',
  },
  'TOL-BUC-F1': {
    bars: [31, 57, 88, 66, 44, 23, 12, 5],
    trend: 'M0,22 L18,18 L36,14 L54,16 L72,11 L90,9 L110,7',
  },
};

function ClubCrest({ teamName, muted = false }) {
  return (
    <div className="flex items-center justify-center mx-auto">
      <TeamShield teamName={teamName} size="lg" muted={muted} />
    </div>
  );
}

function ColombiaFlag({ faded = false }) {
  return (
    <span
      className={`inline-flex flex-col w-4 h-2.5 rounded-[2px] overflow-hidden border border-black/30 mx-auto mt-1 ${faded ? 'opacity-45' : ''
        }`}
      title="Colombia • Liga BetPlay"
    >
      <span className="h-[5px] w-full bg-[#FCD116]" />
      <span className="h-[2.5px] w-full bg-[#003893]" />
      <span className="h-[2.5px] w-full bg-[#CE1126]" />
    </span>
  );
}

function MatchesPanel({ user, pendingQuickBet, onClearQuickBet, onBalanceChange }) {
  const activeCedula = user?.cedula || '1035000001';
  const activeUserName = user ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Usuario';
  const isAdmin = user?.nombre_rol === 'Administrador';

  const [leagues, setLeagues] = useState(FALLBACK_LEAGUES);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [oddsMap, setOddsMap] = useState({});
  const [walletBalance, setWalletBalance] = useState(150000);
  const [userTickets, setUserTickets] = useState([]);

  const [selectedJornada, setSelectedJornada] = useState('ALL');
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [activeMatchTab, setActiveMatchTab] = useState('goleadores');
  const [matchDetailsCache, setMatchDetailsCache] = useState({});
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(true);
  const [liveMinute, setLiveMinute] = useState(64);

  // Paginación de carruseles (< >)
  const [activeSlide, setActiveSlide] = useState(0);
  const [historySlide, setHistorySlide] = useState(0);

  // Cupón de Apuesta
  const [betSlip, setBetSlip] = useState([]);
  const [stakeAmount, setStakeAmount] = useState(20000);
  const [origenFondos, setOrigenFondos] = useState('Billetera');
  const [bancoOrigen, setBancoOrigen] = useState('Bancolombia');
  const [showMobileBetSlip, setShowMobileBetSlip] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submittingBet, setSubmittingBet] = useState(false);
  const [betFeedback, setBetFeedback] = useState(null);

  const buildOddsDictionary = (rawOddsList) => {
    const combined = [...FALLBACK_ODDS, ...(Array.isArray(rawOddsList) ? rawOddsList : [])];
    const grouped = {};
    combined.forEach((item) => {
      if (!grouped[item.codigo_partido]) {
        grouped[item.codigo_partido] = {};
      }
      grouped[item.codigo_partido][item.nombre_mercado] = Number(item.multiplicador_fijado);
    });
    return grouped;
  };

  const loadSportsAndBettingData = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [leaguesRes, matchesRes, playersRes, oddsRes, walletRes, ticketsRes] = await Promise.allSettled([
        getLeagues(),
        getMatches(),
        getPlayers(),
        getAllOdds(),
        getWallet(activeCedula),
        getUserTickets(activeCedula),
      ]);

      if (leaguesRes.status === 'fulfilled' && Array.isArray(leaguesRes.value) && leaguesRes.value.length > 0) {
        setLeagues(leaguesRes.value);
      }

      if (matchesRes.status === 'fulfilled' && Array.isArray(matchesRes.value) && matchesRes.value.length > 0) {
        setMatches(matchesRes.value);
      } else if (matches.length === 0) {
        setMatches(FALLBACK_MATCHES);
      }

      if (playersRes.status === 'fulfilled' && Array.isArray(playersRes.value)) {
        setPlayers(playersRes.value);
      }

      if (oddsRes.status === 'fulfilled') {
        setOddsMap(buildOddsDictionary(oddsRes.value));
      } else {
        setOddsMap(buildOddsDictionary([]));
      }

      if (walletRes.status === 'fulfilled' && walletRes.value?.saldo_disponible !== undefined) {
        setWalletBalance(Number(walletRes.value.saldo_disponible));
      }

      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setUserTickets(ticketsRes.value);
      }
    } catch {
      if (matches.length === 0) setMatches(FALLBACK_MATCHES);
      setOddsMap(buildOddsDictionary([]));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSportsAndBettingData();
  }, [activeCedula]);

  // Reloj y sincronización en tiempo real cada 8 segundos cuando el modo En Vivo está activo
  useEffect(() => {
    if (!liveAutoRefresh) return undefined;
    const interval = setInterval(() => {
      setLiveMinute((prev) => (prev < 90 ? prev + 1 : 45));
      loadSportsAndBettingData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [liveAutoRefresh, activeCedula]);

  // Activar transmisión en vivo en MySQL
  const handleActivateLiveMatches = async () => {
    try {
      await simulateLiveMatches();
      await loadSportsAndBettingData(true);
      setBetFeedback({
        type: 'success',
        text: 'Partidos sincronizados en estado EN VIVO desde la base de datos.',
      });
    } catch {
      setMatches((prev) =>
        prev.map((m) =>
          m.estado_partido === 'Programado' ? { ...m, estado_partido: 'En Vivo' } : m
        )
      );
    }
  };

  // Actualizar marcador en vivo (para pruebas o rol Administrador)
  const handleUpdateLiveScore = async (match, deltaLocal, deltaVis, nuevoEstado, documentoJugador, nombreEvento = 'Gol') => {
    const newLocal = Math.max(0, Number(match.marcador_local || 0) + deltaLocal);
    const newVis = Math.max(0, Number(match.marcador_visitante || 0) + deltaVis);
    const estado = nuevoEstado || match.estado_partido;

    try {
      await updateLiveMatch(match.codigo_partido, {
        marcador_local: newLocal,
        marcador_visitante: newVis,
        estado_partido: estado,
        documento_jugador: documentoJugador,
        nombre_evento: nombreEvento,
        minuto_ocurrencia: liveMinute,
      });
      if (expandedMatch === match.codigo_partido) {
        const refreshedDetails = await getMatchDetails(match.codigo_partido).catch(() => null);
        if (refreshedDetails) {
          setMatchDetailsCache((prev) => ({ ...prev, [match.codigo_partido]: refreshedDetails }));
        }
      }
      await loadSportsAndBettingData(true);
    } catch {
      setMatches((prev) =>
        prev.map((m) =>
          m.codigo_partido === match.codigo_partido
            ? { ...m, marcador_local: newLocal, marcador_visitante: newVis, estado_partido: estado }
            : m
        )
      );
    }
  };

  const handleToggleDetails = async (codigoPartido, initialTab = 'goleadores') => {
    if (expandedMatch === codigoPartido && !initialTab) {
      setExpandedMatch(null);
      return;
    }
    setExpandedMatch(codigoPartido);
    if (initialTab) setActiveMatchTab(initialTab);

    if (!matchDetailsCache[codigoPartido]) {
      try {
        const details = await getMatchDetails(codigoPartido);
        setMatchDetailsCache((prev) => ({ ...prev, [codigoPartido]: details }));
      } catch {
        setMatchDetailsCache((prev) => ({
          ...prev,
          [codigoPartido]: FALLBACK_DETAILS[codigoPartido] || { alineaciones: [], eventos: [] },
        }));
      }
    }
  };

  const handleSelectOdd = (match, nombreMercado, valorCuota) => {
    setBetFeedback(null);
    setBetSlip((prev) => {
      const existingIndex = prev.findIndex((item) => item.codigo_partido === match.codigo_partido);
      if (existingIndex !== -1) {
        if (prev[existingIndex].nombre_mercado === nombreMercado) {
          return prev.filter((item) => item.codigo_partido !== match.codigo_partido);
        }
        const updated = [...prev];
        updated[existingIndex] = {
          codigo_partido: match.codigo_partido,
          partido_label: `${match.equipo_local} vs ${match.equipo_visitante}`,
          nombre_mercado: nombreMercado,
          valor_cuota_congelada: Number(valorCuota),
        };
        return updated;
      }

      return [
        ...prev,
        {
          codigo_partido: match.codigo_partido,
          partido_label: `${match.equipo_local} vs ${match.equipo_visitante}`,
          nombre_mercado: nombreMercado,
          valor_cuota_congelada: Number(valorCuota),
        },
      ];
    });
  };

  // Si el usuario seleccionó una cuota desde la pantalla de Inicio (ej. "Ambos Marcan"),
  // cargarla automáticamente en el Cupón y abrir el modal de confirmación
  useEffect(() => {
    if (pendingQuickBet?.match && pendingQuickBet?.market) {
      handleSelectOdd(pendingQuickBet.match, pendingQuickBet.market, pendingQuickBet.odd);
      setShowMobileBetSlip(true);
      if (onClearQuickBet) onClearQuickBet();
    }
  }, [pendingQuickBet]);

  const removeSelection = (codigoPartido) => {
    setBetSlip((prev) => prev.filter((item) => item.codigo_partido !== codigoPartido));
  };

  const totalOdd = betSlip.reduce((acc, item) => acc * Number(item.valor_cuota_congelada), 1);
  const potentialPayout = betSlip.length > 0 ? Math.round(Number(stakeAmount || 0) * totalOdd) : 0;

  const handlePlaceBet = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (betSlip.length === 0) return;

    const numericStake = Number(stakeAmount);
    if (!numericStake || numericStake <= 0) {
      setBetFeedback({ type: 'error', text: 'Ingresa un monto de apuesta mayor a $0 COP.' });
      return;
    }

    if (origenFondos === 'Billetera' && numericStake > walletBalance) {
      setBetFeedback({
        type: 'error',
        text: `Saldo insuficiente ($${walletBalance.toLocaleString('es-CO')} COP). Elige Pago Directo PSE o recarga tu billetera.`,
      });
      return;
    }

    setSubmittingBet(true);
    setBetFeedback(null);

    const payload = {
      cedula_usuario: activeCedula,
      monto_total: numericStake,
      origen_fondos: origenFondos,
      banco_origen: bancoOrigen,
      nit_empresa: '900123456-1',
      lineas: betSlip.map((item) => ({
        codigo_partido: item.codigo_partido,
        nombre_mercado: item.nombre_mercado,
        valor_cuota_congelada: item.valor_cuota_congelada,
      })),
    };

    try {
      const response = await createTicket(payload);
      if (response.nuevo_saldo !== null && response.nuevo_saldo !== undefined) {
        setWalletBalance(Number(response.nuevo_saldo));
      }
      if (onBalanceChange) onBalanceChange();
      setBetFeedback({
        type: 'success',
        text: `¡Ticket ${response.codigo_ticket} emitido! Ganancia potencial: $${Number(
          response.posible_ganancia_total
        ).toLocaleString('es-CO')} COP`,
      });
      setBetSlip([]);
      await loadSportsAndBettingData(true);
    } catch (error) {
      setBetFeedback({
        type: 'error',
        text: error.response?.data?.message || 'Error al registrar el ticket de apuesta.',
      });
    } finally {
      setSubmittingBet(false);
    }
  };

  const availableJornadas = Array.from(
    new Set(matches.map((m) => m.nombre_jornada || m.codigo_jornada).filter(Boolean))
  );

  // Separar partidos activos (En Vivo / Programado) y partidos finalizados / histórico
  const filteredMatches = matches.filter((m) => {
    const jornadaLabel = m.nombre_jornada || m.codigo_jornada;
    return selectedJornada === 'ALL' || jornadaLabel === selectedJornada;
  });

  const activeMatches = filteredMatches.filter((m) => m.estado_partido !== 'Finalizado');
  const displayActiveMatches = activeMatches.length > 0 ? activeMatches : filteredMatches;

  // Construir tarjetas de Histórico combinando tickets del usuario y partidos finalizados
  const finishedMatches = matches.filter((m) => m.estado_partido === 'Finalizado');
  const historyItems = [
    ...userTickets.map((tk) => {
      const firstLine = Array.isArray(tk.lineas) && tk.lineas[0] ? tk.lineas[0] : null;
      const relatedMatch = matches.find((m) => m.codigo_partido === firstLine?.codigo_partido);
      return {
        id: tk.codigo_ticket,
        equipo_local: relatedMatch?.equipo_local || 'Atlético Nacional',
        equipo_visitante: relatedMatch?.equipo_visitante || 'Millonarios FC',
        estado: tk.estado_ticket, // 'Ganada' | 'Perdida' | 'Anulada' | 'Pendiente'
        subtitulo: `${firstLine?.nombre_mercado || 'Cuota Simple'} • $${Number(
          tk.posible_ganancia_total
        ).toLocaleString('es-CO')} COP`,
      };
    }),
    ...finishedMatches.map((fm) => ({
      id: fm.codigo_partido,
      equipo_local: fm.equipo_local,
      equipo_visitante: fm.equipo_visitante,
      estado: fm.marcador_local > fm.marcador_visitante ? 'Ganada' : 'Finalizado',
      subtitulo: `Marcador Final: ${fm.marcador_local} - ${fm.marcador_visitante}`,
    })),
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Barra Superior Limpia: Título y Filtro por Jornadas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 mb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {leagues[0]?.nombre_torneo || 'Liga BetPlay Dimayor'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Selecciona tus pronósticos en partidos en vivo o programados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedJornada('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedJornada === 'ALL'
                ? 'bg-[#39FF14] text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            Todas las Fechas
          </button>
          {availableJornadas.map((jornada) => (
            <button
              key={jornada}
              type="button"
              onClick={() => setSelectedJornada(jornada)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedJornada === jornada
                  ? 'bg-[#39FF14] text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {jornada}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Principal: Tarjetas Estilo ApuestaX (Izquierda 2/3) + Cupón (Derecha 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
        <div className="lg:col-span-2 space-y-10">
          {/* ===================================================================== */}
          {/* SECCIÓN 1: APUESTAS ACTIVAS O VISTA INTERNA DEL PARTIDO (MATCH CENTER) */}
          {/* ===================================================================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {expandedMatch && (
                  <button
                    type="button"
                    onClick={() => setExpandedMatch(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-[#39FF14] text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>←</span> Volver a Partidos
                  </button>
                )}
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {expandedMatch ? 'Centro del Partido y Apuestas de Jugadores' : 'Apuestas Activas'}
                </h2>
              </div>

              {!expandedMatch && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-[#182232] hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlide((prev) =>
                        prev + 1 < displayActiveMatches.length ? prev + 1 : 0
                      )
                    }
                    className="w-8 h-8 rounded-lg bg-[#182232] hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="bg-[#182232] border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-10 h-10 border-4 border-[#39FF14] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-400 text-sm">Sincronizando partidos en vivo...</p>
              </div>
            ) : expandedMatch ? (
              (() => {
                const match =
                  matches.find((m) => m.codigo_partido === expandedMatch) ||
                  displayActiveMatches[0];
                if (!match) return null;

                const matchOdds = oddsMap[match.codigo_partido] || {
                  'Gana Local': 1.85,
                  Empate: 3.1,
                  'Gana Visitante': 3.65,
                  'Más de 2.5 Goles': 1.9,
                  'Menos de 2.5 Goles': 1.85,
                  'Ambos Marcan': 1.8,
                };
                const oddLocal = matchOdds['Gana Local'] || 1.85;
                const oddEmpate = matchOdds['Empate'] || 3.1;
                const oddVisitante = matchOdds['Gana Visitante'] || 3.65;
                const oddMas25 = matchOdds['Más de 2.5 Goles'] || 1.9;
                const oddMenos25 = matchOdds['Menos de 2.5 Goles'] || 1.85;
                const oddAmbos =
                  matchOdds['Ambos Marcan'] || matchOdds['Ambos Equipos Anotan'] || 1.8;

                const selectedLine = betSlip.find(
                  (item) => item.codigo_partido === match.codigo_partido
                );
                const localStyle = TEAM_STYLES[match.equipo_local] || { short: match.equipo_local };
                const visStyle = TEAM_STYLES[match.equipo_visitante] || { short: match.equipo_visitante };
                const details = matchDetailsCache[match.codigo_partido] || {
                  alineaciones: [],
                  eventos: [],
                };

                const matchPlayers = players.filter(
                  (p) =>
                    p.nombre_equipo === match.equipo_local ||
                    p.nombre_equipo === match.equipo_visitante
                );
                const fullRoster =
                  details.alineaciones?.length > 0 ? details.alineaciones : matchPlayers;

                const localPlayers = fullRoster.filter(
                  (p) => p.nombre_equipo === match.equipo_local
                );
                const visitorPlayers = fullRoster.filter(
                  (p) => p.nombre_equipo === match.equipo_visitante
                );

                const getPlayerGoalOdd = (jug) => {
                  const nombreJug = jug.nombre_jugador || jug.nombre_completo;
                  return (
                    matchOdds[`Gol: ${nombreJug}`] ||
                    (jug.posicion_habitual === 'Delantero'
                      ? 2.25
                      : jug.posicion_habitual === 'Volante'
                        ? 2.95
                        : 4.5)
                  );
                };

                const getPlayerCardOdd = (jug) => {
                  const nombreJug = jug.nombre_jugador || jug.nombre_completo;
                  return matchOdds[`Tarjeta: ${nombreJug}`] || 3.2;
                };

                return (
                  <div className="space-y-5">
                    {/* Selector rápido para cambiar de partido sin regresar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {displayActiveMatches.map((m) => {
                        const active = m.codigo_partido === match.codigo_partido;
                        const lShort = TEAM_STYLES[m.equipo_local]?.short || m.equipo_local;
                        const vShort = TEAM_STYLES[m.equipo_visitante]?.short || m.equipo_visitante;
                        return (
                          <button
                            key={m.codigo_partido}
                            type="button"
                            onClick={() => handleToggleDetails(m.codigo_partido, activeMatchTab)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition cursor-pointer ${
                              active
                                ? 'bg-[#39FF14]/15 border-[#39FF14] text-[#39FF14]'
                                : 'bg-[#182232] border-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            {lShort} vs {vShort} ({m.marcador_local}-{m.marcador_visitante})
                          </button>
                        );
                      })}
                    </div>

                    {/* Contenedor Principal del Centro del Partido */}
                    <div className="rounded-3xl bg-[#1c2636] border border-slate-700/70 shadow-2xl overflow-hidden">
                      {/* Banner Superior tipo Estadio */}
                      <div className="bg-gradient-to-b from-[#111827] to-[#1c2636] p-6 border-b border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-5">
                          <span className="font-semibold text-slate-300">
                            Estadio {match.nombre_estadio} ({match.ciudad || 'Colombia'}) • Árbitro:{' '}
                            <strong className="text-white">{match.arbitro || 'Designado'}</strong>
                          </span>
                          {match.estado_partido === 'En Vivo' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-[#39FF14] font-extrabold text-xs">
                              <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
                              EN VIVO {liveMinute}&apos;
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold">
                              {match.estado_partido}
                            </span>
                          )}
                        </div>

                        {/* Equipos, Escudos, Marcador y Directores Técnicos con espacio amplio */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-6 text-center">
                          <div className="flex flex-col items-center bg-[#111827]/70 border border-slate-800/90 rounded-2xl p-4">
                            <ClubCrest teamName={match.equipo_local} />
                            <h3 className="mt-2 text-base sm:text-lg font-extrabold text-white">
                              {match.equipo_local}
                            </h3>
                            <ColombiaFlag />
                            <div className="mt-3 pt-2.5 border-t border-slate-800 w-full">
                              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                                Director Técnico
                              </span>
                              <span className="text-sm font-bold text-[#39FF14] block mt-0.5">
                                {match.dt_local || 'Por definir'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                              {match.nombre_jornada || 'Liga BetPlay Dimayor'}
                            </span>
                            <div className="my-3 px-6 py-3 rounded-2xl bg-[#0f172a] border border-slate-700 text-3xl font-black text-white font-mono tracking-wider shadow-inner">
                              {match.marcador_local} - {match.marcador_visitante}
                            </div>
                            {selectedLine && (
                              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14] text-xs font-bold">
                                  En cupón: {selectedLine.nombre_mercado} (
                                  {selectedLine.valor_cuota_congelada.toFixed(2)})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowMobileBetSlip(true)}
                                  className="px-3.5 py-1 rounded-full bg-[#39FF14] text-slate-950 text-xs font-extrabold shadow-md shadow-[#39FF14]/30 hover:brightness-110 transition cursor-pointer"
                                >
                                  Apostar Ahora
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-center bg-[#111827]/70 border border-slate-800/90 rounded-2xl p-4">
                            <ClubCrest teamName={match.equipo_visitante} />
                            <h3 className="mt-2 text-base sm:text-lg font-extrabold text-white">
                              {match.equipo_visitante}
                            </h3>
                            <ColombiaFlag />
                            <div className="mt-3 pt-2.5 border-t border-slate-800 w-full">
                              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                                Director Técnico
                              </span>
                              <span className="text-sm font-bold text-[#39FF14] block mt-0.5">
                                {match.dt_visitante || 'Por definir'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pestañas de Navegación Interna del Partido */}
                      <div className="bg-[#111827] px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap gap-2">
                        {[
                          { id: 'goleadores', label: 'Apuesta Goleador (Anota Gol)' },
                          { id: 'tarjetas', label: 'Tarjetas por Jugador' },
                          { id: 'mercados', label: 'Mercados del Partido (1X2 y Goles)' },
                          { id: 'alineaciones', label: 'Plantillas e Incidencias en Vivo' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveMatchTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                              activeMatchTab === tab.id
                                ? 'bg-[#39FF14] text-slate-950 shadow-md shadow-[#39FF14]/25'
                                : 'bg-[#1c2636] text-slate-300 hover:text-white border border-slate-700/70'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Contenido de la Pestaña Activa */}
                      <div className="p-5 sm:p-6">
                        {/* PESTAÑA 1: GOLEADORES (2 COLUMNAS AMPLIAS POR EQUIPO) */}
                        {activeMatchTab === 'goleadores' && (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                              <div>
                                <h4 className="text-base font-extrabold text-white">
                                  Jugador Anota Gol en Cualquier Momento
                                </h4>
                                <p className="text-xs text-slate-400">
                                  Haz clic sobre la cuota de cualquier jugador para agregarlo directamente a tu Cupón de Apuesta.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {[
                                {
                                  teamName: match.equipo_local,
                                  dt: match.dt_local,
                                  roster: localPlayers.filter((p) => p.posicion_habitual !== 'Portero'),
                                },
                                {
                                  teamName: match.equipo_visitante,
                                  dt: match.dt_visitante,
                                  roster: visitorPlayers.filter((p) => p.posicion_habitual !== 'Portero'),
                                },
                              ].map((group) => (
                                <div
                                  key={group.teamName}
                                  className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-4 space-y-3"
                                >
                                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                                    <div>
                                      <h5 className="text-sm font-extrabold text-white">
                                        {group.teamName}
                                      </h5>
                                      <span className="text-[11px] text-slate-400">
                                        DT: <strong className="text-slate-200">{group.dt}</strong>
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#39FF14]">
                                      Cuota Gol
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {group.roster.map((jug) => {
                                      const nombreJug = jug.nombre_jugador || jug.nombre_completo;
                                      const mktGol = `Gol: ${nombreJug}`;
                                      const cuotaGol = getPlayerGoalOdd(jug);
                                      const isSelected = selectedLine?.nombre_mercado === mktGol;

                                      return (
                                        <button
                                          key={jug.documento_jugador || nombreJug}
                                          type="button"
                                          onClick={() => handleSelectOdd(match, mktGol, cuotaGol)}
                                          className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
                                            isSelected
                                              ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-lg shadow-[#39FF14]/25'
                                              : 'bg-[#1c2636] hover:bg-slate-800/90 text-white border-slate-700/70 hover:border-[#39FF14]/60'
                                          }`}
                                        >
                                          <div>
                                            <span
                                              className={`text-sm font-extrabold block ${
                                                isSelected ? 'text-slate-950' : 'text-white'
                                              }`}
                                            >
                                              {nombreJug}
                                            </span>
                                            <span
                                              className={`text-xs block mt-0.5 ${
                                                isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'
                                              }`}
                                            >
                                              {jug.posicion_habitual}
                                            </span>
                                          </div>

                                          <span
                                            className={`px-3 py-1.5 rounded-lg font-mono text-sm font-black shrink-0 ${
                                              isSelected
                                                ? 'bg-slate-950 text-[#39FF14]'
                                                : 'bg-[#111827] text-[#39FF14] border border-slate-700'
                                            }`}
                                          >
                                            {Number(cuotaGol).toFixed(2)}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PESTAÑA 2: TARJETAS POR JUGADOR */}
                        {activeMatchTab === 'tarjetas' && (
                          <div className="space-y-4">
                            <div className="pb-2 border-b border-slate-800">
                              <h4 className="text-base font-extrabold text-white">
                                Jugador Recibe Tarjeta en el Partido
                              </h4>
                              <p className="text-xs text-slate-400">
                                Selecciona qué jugador recibirá amonestación durante el encuentro.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {[
                                {
                                  teamName: match.equipo_local,
                                  dt: match.dt_local,
                                  roster: localPlayers,
                                },
                                {
                                  teamName: match.equipo_visitante,
                                  dt: match.dt_visitante,
                                  roster: visitorPlayers,
                                },
                              ].map((group) => (
                                <div
                                  key={group.teamName}
                                  className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-4 space-y-3"
                                >
                                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                                    <div>
                                      <h5 className="text-sm font-extrabold text-white">
                                        {group.teamName}
                                      </h5>
                                      <span className="text-[11px] text-slate-400">
                                        DT: <strong className="text-slate-200">{group.dt}</strong>
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-400">
                                      Cuota Tarjeta
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {group.roster.map((jug) => {
                                      const nombreJug = jug.nombre_jugador || jug.nombre_completo;
                                      const mktTarjeta = `Tarjeta: ${nombreJug}`;
                                      const cuotaTarjeta = getPlayerCardOdd(jug);
                                      const isSelected = selectedLine?.nombre_mercado === mktTarjeta;

                                      return (
                                        <button
                                          key={jug.documento_jugador || nombreJug}
                                          type="button"
                                          onClick={() =>
                                            handleSelectOdd(match, mktTarjeta, cuotaTarjeta)
                                          }
                                          className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
                                            isSelected
                                              ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-lg shadow-[#39FF14]/25'
                                              : 'bg-[#1c2636] hover:bg-slate-800/90 text-white border-slate-700/70 hover:border-amber-400/60'
                                          }`}
                                        >
                                          <div>
                                            <span
                                              className={`text-sm font-extrabold block ${
                                                isSelected ? 'text-slate-950' : 'text-white'
                                              }`}
                                            >
                                              {nombreJug}
                                            </span>
                                            <span
                                              className={`text-xs block mt-0.5 ${
                                                isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'
                                              }`}
                                            >
                                              {jug.posicion_habitual}
                                            </span>
                                          </div>

                                          <span
                                            className={`px-3 py-1.5 rounded-lg font-mono text-sm font-black shrink-0 ${
                                              isSelected
                                                ? 'bg-slate-950 text-[#39FF14]'
                                                : 'bg-[#111827] text-amber-300 border border-slate-700'
                                            }`}
                                          >
                                            {Number(cuotaTarjeta).toFixed(2)}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PESTAÑA 3: MERCADOS PRINCIPALES DEL PARTIDO (1X2 Y GOLES) */}
                        {activeMatchTab === 'mercados' && (
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                                Resultado Final (1X2)
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                  {
                                    label: `Gana ${match.equipo_local}`,
                                    market: 'Gana Local',
                                    value: oddLocal,
                                  },
                                  { label: 'Empate', market: 'Empate', value: oddEmpate },
                                  {
                                    label: `Gana ${match.equipo_visitante}`,
                                    market: 'Gana Visitante',
                                    value: oddVisitante,
                                  },
                                ].map((oddBox) => {
                                  const isSelected = selectedLine?.nombre_mercado === oddBox.market;
                                  return (
                                    <button
                                      key={oddBox.market}
                                      type="button"
                                      onClick={() =>
                                        handleSelectOdd(match, oddBox.market, oddBox.value)
                                      }
                                      className={`rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer border ${
                                        isSelected
                                          ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-lg shadow-[#39FF14]/25'
                                          : 'bg-[#111827] hover:bg-slate-900 text-white border-slate-800 hover:border-[#39FF14]/50'
                                      }`}
                                    >
                                      <span className="text-sm font-bold">{oddBox.label}</span>
                                      <span
                                        className={`text-base font-black font-mono ${
                                          isSelected ? 'text-slate-950' : 'text-[#39FF14]'
                                        }`}
                                      >
                                        {Number(oddBox.value).toFixed(2)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                                Mercados de Goles y Ambos Anotan
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                  {
                                    label: 'Más de 2.5 Goles',
                                    market: 'Más de 2.5 Goles',
                                    value: oddMas25,
                                  },
                                  {
                                    label: 'Menos de 2.5 Goles',
                                    market: 'Menos de 2.5 Goles',
                                    value: oddMenos25,
                                  },
                                  { label: 'Ambos Equipos Marcan', market: 'Ambos Marcan', value: oddAmbos },
                                ].map((oddBox) => {
                                  const isSelected = selectedLine?.nombre_mercado === oddBox.market;
                                  return (
                                    <button
                                      key={oddBox.market}
                                      type="button"
                                      onClick={() =>
                                        handleSelectOdd(match, oddBox.market, oddBox.value)
                                      }
                                      className={`rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer border ${
                                        isSelected
                                          ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-lg shadow-[#39FF14]/25'
                                          : 'bg-[#111827] hover:bg-slate-900 text-white border-slate-800 hover:border-[#39FF14]/50'
                                      }`}
                                    >
                                      <span className="text-sm font-bold">{oddBox.label}</span>
                                      <span
                                        className={`text-base font-black font-mono ${
                                          isSelected ? 'text-slate-950' : 'text-[#39FF14]'
                                        }`}
                                      >
                                        {Number(oddBox.value).toFixed(2)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PESTAÑA 4: PLANTILLAS COMPLETAS E INCIDENCIAS EN VIVO */}
                        {activeMatchTab === 'alineaciones' && (
                          <div className="space-y-6">
                            {/* Cronología de Incidencias */}
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#39FF14] mb-3">
                                Incidencias Registradas en el Partido
                              </h4>
                              {details.eventos?.length > 0 ? (
                                <div className="space-y-2">
                                  {details.eventos.map((ev, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between bg-[#1c2636] border border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                                    >
                                      <span>
                                        <strong className="text-[#39FF14] font-mono mr-2">
                                          {ev.minuto_ocurrencia}&apos;
                                        </strong>
                                        {ev.nombre_evento === 'Gol'
                                          ? 'Gol de '
                                          : 'Tarjeta Amarilla para '}
                                        <strong className="text-white">{ev.nombre_jugador}</strong>
                                      </span>
                                      <span className="text-xs font-semibold text-slate-400">
                                        {ev.nombre_equipo}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 text-xs">
                                  Sin goles ni tarjetas registradas en la bitácora aún.
                                </p>
                              )}
                            </div>

                            {/* Plantillas Titulares por Equipo */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {[
                                {
                                  teamName: match.equipo_local,
                                  dt: match.dt_local,
                                  roster: localPlayers,
                                  esLocal: true,
                                },
                                {
                                  teamName: match.equipo_visitante,
                                  dt: match.dt_visitante,
                                  roster: visitorPlayers,
                                  esLocal: false,
                                },
                              ].map((group) => (
                                <div
                                  key={group.teamName}
                                  className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3"
                                >
                                  <div className="pb-2.5 border-b border-slate-800">
                                    <h5 className="text-sm font-extrabold text-white">
                                      Plantilla {group.teamName}
                                    </h5>
                                    <span className="text-xs text-[#39FF14] font-semibold">
                                      DT: {group.dt}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {group.roster.map((jug) => {
                                      const nombreJug = jug.nombre_jugador || jug.nombre_completo;
                                      return (
                                        <div
                                          key={jug.documento_jugador || nombreJug}
                                          className="flex items-center justify-between bg-[#1c2636] border border-slate-800 rounded-xl px-3.5 py-2.5"
                                        >
                                          <div>
                                            <span className="text-sm font-bold text-white block">
                                              {nombreJug}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                              {jug.posicion_habitual}
                                            </span>
                                          </div>
                                          {isAdmin && (
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleUpdateLiveScore(
                                                    match,
                                                    group.esLocal ? 1 : 0,
                                                    group.esLocal ? 0 : 1,
                                                    'En Vivo',
                                                    jug.documento_jugador,
                                                    'Gol'
                                                  )
                                                }
                                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[#39FF14] text-xs font-bold cursor-pointer"
                                              >
                                                + Gol
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleUpdateLiveScore(
                                                    match,
                                                    0,
                                                    0,
                                                    'En Vivo',
                                                    jug.documento_jugador,
                                                    'Tarjeta Amarilla'
                                                  )
                                                }
                                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
                                              >
                                                + Tarjeta
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayActiveMatches.map((match) => {
                  const matchOdds = oddsMap[match.codigo_partido] || {
                    'Gana Local': 1.85,
                    Empate: 3.1,
                    'Gana Visitante': 3.65,
                    'Más de 2.5 Goles': 1.9,
                    'Menos de 2.5 Goles': 1.85,
                    'Ambos Marcan': 1.8,
                  };
                  const oddLocal = matchOdds['Gana Local'] || 1.85;
                  const oddEmpate = matchOdds['Empate'] || 3.1;
                  const oddVisitante = matchOdds['Gana Visitante'] || 3.65;
                  const oddMas25 = matchOdds['Más de 2.5 Goles'] || 1.9;
                  const oddMenos25 = matchOdds['Menos de 2.5 Goles'] || 1.85;
                  const oddAmbos =
                    matchOdds['Ambos Marcan'] || matchOdds['Ambos Equipos Anotan'] || 1.8;

                  const selectedLine = betSlip.find(
                    (item) => item.codigo_partido === match.codigo_partido
                  );
                  const localStyle = TEAM_STYLES[match.equipo_local] || { short: match.equipo_local };
                  const visStyle = TEAM_STYLES[match.equipo_visitante] || { short: match.equipo_visitante };
                  const isPlayerSelection =
                    selectedLine?.nombre_mercado?.startsWith('Gol: ') ||
                    selectedLine?.nombre_mercado?.startsWith('Tarjeta: ');

                  return (
                    <article
                      key={match.codigo_partido}
                      className="rounded-2xl bg-[#1c2636] border border-slate-700/60 hover:border-[#39FF14]/50 p-5 flex flex-col justify-between shadow-xl shadow-black/40 transition-all"
                    >
                      {/* Indicador En Vivo / Jornada */}
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="text-slate-400 font-semibold">
                          {match.nombre_jornada || 'Liga BetPlay'} • {match.nombre_estadio}
                        </span>
                        {match.estado_partido === 'En Vivo' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-[#39FF14] font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-ping" />
                            EN VIVO {liveMinute}&apos;
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">{match.estado_partido}</span>
                        )}
                      </div>

                      {/* Cabecera Espaciosa: Escudos, Nombres Completos, DTs y Marcador */}
                      <div
                        onClick={() => handleToggleDetails(match.codigo_partido, 'goleadores')}
                        className="grid grid-cols-3 items-center text-center my-2 cursor-pointer group"
                        title="Haz clic para ingresar al partido"
                      >
                        <div className="flex flex-col items-center">
                          <ClubCrest teamName={match.equipo_local} />
                          <span className="mt-2 text-sm font-extrabold text-white group-hover:text-[#39FF14] transition">
                            {localStyle.short}
                          </span>
                          <ColombiaFlag />
                          <span className="mt-1.5 text-[11px] text-slate-400">
                            DT: <strong className="text-slate-200">{match.dt_local || 'Activo'}</strong>
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-slate-400 tracking-wider">VS</span>
                          <span className="my-1.5 px-3.5 py-1 rounded-xl bg-[#0f172a] border border-slate-700/80 text-base font-black text-white font-mono">
                            {match.marcador_local} - {match.marcador_visitante}
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <ClubCrest teamName={match.equipo_visitante} />
                          <span className="mt-2 text-sm font-extrabold text-white group-hover:text-[#39FF14] transition">
                            {visStyle.short}
                          </span>
                          <ColombiaFlag />
                          <span className="mt-1.5 text-[11px] text-slate-400">
                            DT: <strong className="text-slate-200">{match.dt_visitante || 'Activo'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Mercados Rápidos: 1X2 + Goles y Ambos Marcan */}
                      <div className="space-y-2 my-3.5">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Local', market: 'Gana Local', value: oddLocal },
                            { label: 'Empate', market: 'Empate', value: oddEmpate },
                            { label: 'Visita', market: 'Gana Visitante', value: oddVisitante },
                          ].map((oddBox) => {
                            const isSelected = selectedLine?.nombre_mercado === oddBox.market;
                            return (
                              <button
                                key={oddBox.market}
                                type="button"
                                onClick={() => handleSelectOdd(match, oddBox.market, oddBox.value)}
                                className={`rounded-xl py-2 px-2 text-center transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-md shadow-[#39FF14]/30'
                                    : 'bg-[#111827] hover:bg-slate-900 text-white border-slate-800 hover:border-[#39FF14]/50'
                                }`}
                              >
                                <span
                                  className={`block text-[11px] font-medium ${
                                    isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                                  }`}
                                >
                                  {oddBox.label}
                                </span>
                                <span className="block text-sm font-extrabold font-mono mt-0.5">
                                  {Number(oddBox.value).toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '+2.5 Goles', market: 'Más de 2.5 Goles', value: oddMas25 },
                            { label: '-2.5 Goles', market: 'Menos de 2.5 Goles', value: oddMenos25 },
                            { label: 'Ambos Marcan', market: 'Ambos Marcan', value: oddAmbos },
                          ].map((oddBox) => {
                            const isSelected = selectedLine?.nombre_mercado === oddBox.market;
                            return (
                              <button
                                key={oddBox.market}
                                type="button"
                                onClick={() => handleSelectOdd(match, oddBox.market, oddBox.value)}
                                className={`rounded-xl py-2 px-2 text-center transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-md shadow-[#39FF14]/30'
                                    : 'bg-[#0d1526] hover:bg-slate-900 text-white border-slate-800/90 hover:border-[#39FF14]/50'
                                }`}
                              >
                                <span
                                  className={`block text-[11px] font-medium ${
                                    isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                                  }`}
                                >
                                  {oddBox.label}
                                </span>
                                <span className="block text-sm font-extrabold font-mono mt-0.5">
                                  {Number(oddBox.value).toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Si el usuario seleccionó cualquier cuota en este partido (ej. Ambos Marcan), mostrar botón directo para Apostar */}
                      {selectedLine && (
                        <div className="mb-3 p-2.5 rounded-xl bg-[#39FF14]/15 border border-[#39FF14]/60 flex items-center justify-between gap-2 animate-fadeIn">
                          <div className="min-w-0">
                            <span className="text-[11px] font-extrabold text-[#39FF14] block truncate">
                              Seleccionado: {selectedLine.nombre_mercado} ({selectedLine.valor_cuota_congelada.toFixed(2)}x)
                            </span>
                            <span className="text-[10px] text-slate-300 block">
                              Ganancia est.: ${potentialPayout.toLocaleString('es-CO')} COP
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMobileBetSlip(true)}
                            className="px-3.5 py-2 rounded-xl bg-[#39FF14] text-slate-950 font-black text-xs shadow-lg shadow-[#39FF14]/30 hover:brightness-110 active:scale-95 transition cursor-pointer shrink-0"
                          >
                            Apostar Ahora
                          </button>
                        </div>
                      )}

                      {/* Botón Principal para Ingresar al Partido y Apostar por Jugadores */}
                      <button
                        type="button"
                        onClick={() => handleToggleDetails(match.codigo_partido, 'goleadores')}
                        className={`mt-1 w-full rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition border ${
                          isPlayerSelection
                            ? 'bg-[#39FF14]/15 border-[#39FF14] text-[#39FF14]'
                            : 'bg-[#111827] hover:bg-slate-900 border-slate-800 hover:border-[#39FF14]/60 text-slate-200'
                        }`}
                      >
                        <div className="text-left">
                          <span className="text-xs font-extrabold block text-white">
                            {isPlayerSelection
                              ? `Seleccionado: ${selectedLine.nombre_mercado}`
                              : 'Ingresar al Partido • Apuestas de Jugadores'}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Goleadores, tarjetas, técnicos y alineaciones completas
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#1c2636] text-[#39FF14] text-xs font-extrabold shrink-0">
                          Entrar
                        </span>
                      </button>

                      {/* Controles rápidos de marcador en vivo para el Administrador */}
                      {isAdmin && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateLiveScore(match, -1, 0, 'En Vivo')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLiveScore(match, 1, 0, 'En Vivo')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[#39FF14] font-bold cursor-pointer"
                            >
                              +1 Local
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateLiveScore(match, 0, -1, 'En Vivo')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLiveScore(match, 0, 1, 'En Vivo')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[#39FF14] font-bold cursor-pointer"
                            >
                              +1 Visita
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateLiveScore(
                                match,
                                0,
                                0,
                                match.estado_partido === 'En Vivo' ? 'Finalizado' : 'En Vivo'
                              )
                            }
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            {match.estado_partido === 'En Vivo' ? 'Finalizar' : 'Poner En Vivo'}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ===================================================================== */}
          {/* SECCIÓN 2: HISTÓRICO DE APUESTAS (CON BARRA LATERAL VERDE / ROJA / GRIS) */}
          {/* ===================================================================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Histórico de Apuestas
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistorySlide((prev) => Math.max(0, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#182232] hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                  aria-label="Anterior histórico"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHistorySlide((prev) => (prev + 1 < historyItems.length ? prev + 1 : 0))
                  }
                  className="w-8 h-8 rounded-lg bg-[#182232] hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                  aria-label="Siguiente histórico"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {historyItems.slice(0, 6).map((item, index) => {
                // Determinar color de la franja lateral izquierda como en la imagen
                const accentColorClass =
                  item.estado === 'Ganada' || index === 0
                    ? 'border-l-[5px] border-l-[#39FF14]'
                    : item.estado === 'Perdida' || item.estado === 'Anulada' || index === 1
                      ? 'border-l-[5px] border-l-red-500'
                      : 'border-l-[5px] border-l-slate-400';

                const localShort =
                  TEAM_STYLES[item.equipo_local]?.short || item.equipo_local;
                const visShort =
                  TEAM_STYLES[item.equipo_visitante]?.short || item.equipo_visitante;

                return (
                  <article
                    key={`${item.id}-${index}`}
                    className={`rounded-2xl bg-[#1c2636]/90 border border-slate-700/50 ${accentColorClass} p-5 flex flex-col justify-between shadow-lg shadow-black/30`}
                  >
                    <div className="grid grid-cols-3 items-center text-center">
                      <div className="flex flex-col items-center">
                        <ClubCrest teamName={item.equipo_local} muted />
                        <span className="mt-1 text-xs font-medium text-slate-400 truncate max-w-[80px]">
                          {localShort}
                        </span>
                        <ColombiaFlag faded />
                      </div>

                      <span className="text-xs font-bold text-slate-500">VS</span>

                      <div className="flex flex-col items-center">
                        <ClubCrest teamName={item.equipo_visitante} muted />
                        <span className="mt-1 text-xs font-medium text-slate-400 truncate max-w-[80px]">
                          {visShort}
                        </span>
                        <ColombiaFlag faded />
                      </div>
                    </div>

                    <div className="border-t border-slate-700/60 mt-4 pt-3">
                      <h3 className="text-lg font-bold text-white leading-tight">Resultado</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subtitulo}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* ===================================================================== */}
        {/* COLUMNA DERECHA: CUPÓN DE APUESTA + CONSOLA DEPORTIVA (SI ES ADMIN) */}
        {/* ===================================================================== */}
        <aside id="cupon-apuesta-panel" className="space-y-6 lg:sticky lg:top-20">
          <div className="bg-[#1c2636] border border-slate-700/70 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39FF14]"></span>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wide">
                  Cupón de Apuesta
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-[#39FF14] text-xs font-bold">
                {betSlip.length} {betSlip.length === 1 ? 'selección' : 'selecciones'}
              </span>
            </div>

            {betSlip.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-300 text-sm font-medium">Tu cupón está vacío.</p>
                <p className="text-slate-400 text-xs mt-1">
                  Selecciona cualquier cuota (`Local`, `Empate`, `Visita`, `+2.5 Goles`, `Ambos Marcan` o un jugador) para activar tu apuesta.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePlaceBet} className="space-y-4">
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {betSlip.map((item) => (
                    <div
                      key={item.codigo_partido}
                      className="bg-[#111827] border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="text-[11px] text-slate-400 block">{item.partido_label}</span>
                        <span className="text-xs font-bold text-white">{item.nombre_mercado}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[#39FF14] font-mono text-xs font-bold">
                          {item.valor_cuota_congelada.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelection(item.codigo_partido)}
                          className="text-slate-500 hover:text-red-400 text-xs font-bold px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Billetera', 'PSE'].map((metodo) => (
                      <button
                        key={metodo}
                        type="button"
                        onClick={() => setOrigenFondos(metodo)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          origenFondos === metodo
                            ? 'bg-[#39FF14]/15 border-[#39FF14] text-[#39FF14]'
                            : 'bg-[#111827] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {metodo === 'Billetera' ? 'Saldo en Billetera' : 'Wompi / PSE'}
                      </button>
                    ))}
                  </div>
                </div>

                {origenFondos === 'PSE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Entidad Bancaria (Pasarela Wompi / PSE)
                    </label>
                    <select
                      value={bancoOrigen}
                      onChange={(e) => setBancoOrigen(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] text-white text-xs rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                    >
                      {BANCOS_PSE.map((banco) => (
                        <option key={banco} value={banco}>
                          {banco}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Monto a Apostar (COP)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111827] text-white font-mono text-sm rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {[10000, 20000, 50000, 100000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStakeAmount(preset)}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition cursor-pointer"
                      >
                        ${preset / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Cuota Combinada:</span>
                    <span className="font-mono font-bold text-white">{totalOdd.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-200">Posible Ganancia:</span>
                    <span className="text-base font-black text-[#39FF14] font-mono">
                      ${potentialPayout.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingBet}
                  className="w-full py-3 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-sm shadow-lg shadow-[#39FF14]/20 hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingBet
                    ? 'Procesando Apuesta...'
                    : origenFondos === 'PSE'
                      ? `Pagar con Wompi (${bancoOrigen})`
                      : 'Confirmar Apuesta'}
                </button>
              </form>
            )}

            {betFeedback && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs border ${
                  betFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {betFeedback.text}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="bg-[#1c2636] border border-slate-700/70 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#39FF14]"></span>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                    Consola de Control Deportivo
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-[#39FF14] text-[10px] font-bold">
                  Admin
                </span>
              </div>

              <div className="space-y-2.5">
                {matches.map((m) => (
                  <div
                    key={m.codigo_partido}
                    className="bg-[#111827] border border-slate-800 rounded-xl p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {TEAM_STYLES[m.equipo_local]?.short || m.equipo_local} vs{' '}
                        {TEAM_STYLES[m.equipo_visitante]?.short || m.equipo_visitante}
                      </span>
                      <span className="font-mono font-extrabold text-[#39FF14]">
                        {m.marcador_local} - {m.marcador_visitante}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateLiveScore(m, 1, 0, 'En Vivo')}
                        className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[#39FF14] font-bold cursor-pointer"
                      >
                        +1 Local
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLiveScore(m, 0, 1, 'En Vivo')}
                        className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[#39FF14] font-bold cursor-pointer"
                      >
                        +1 Visita
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateLiveScore(
                            m,
                            0,
                            0,
                            m.estado_partido === 'En Vivo' ? 'Finalizado' : 'En Vivo'
                          )
                        }
                        className="flex-1 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      >
                        {m.estado_partido === 'En Vivo' ? 'Finalizar' : 'En Vivo'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ===================================================================== */}
      {/* BARRA FLOTANTE INFERIOR DE APUESTA RÁPIDA (VISIBLE EN CELULAR Y ESCRITORIO) */}
      {/* ===================================================================== */}
      {betSlip.length > 0 && !showMobileBetSlip && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b132b]/95 backdrop-blur-md border-t-2 border-[#39FF14] px-3 sm:px-6 py-3 shadow-2xl shadow-black">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div
              onClick={() => setShowMobileBetSlip(true)}
              className="min-w-0 flex-1 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#39FF14] text-slate-950 text-[11px] font-black">
                  {betSlip.length} {betSlip.length === 1 ? 'Selección' : 'Selecciones'}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                  {betSlip.map((b) => b.nombre_mercado).join(' + ')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Cuota <strong className="text-[#39FF14] font-mono">{totalOdd.toFixed(2)}x</strong> •
                Posible ganancia:{' '}
                <strong className="text-[#39FF14] font-mono">
                  ${potentialPayout.toLocaleString('es-CO')} COP
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMobileBetSlip(true)}
                className="px-3.5 sm:px-5 py-2.5 rounded-xl bg-[#39FF14] text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-[#39FF14]/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                Apostar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL INTERACTIVO DEL CUPÓN DE APUESTA (IDEAL PARA MÓVIL Y APUESTA RÁPIDA) */}
      {/* ===================================================================== */}
      {showMobileBetSlip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#1c2636] border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39FF14]"></span>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide">
                  Confirmar tu Apuesta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileBetSlip(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {betSlip.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                {betFeedback ? (
                  <div
                    className={`p-4 rounded-xl text-xs sm:text-sm border ${
                      betFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/40 text-red-300'
                    }`}
                  >
                    {betFeedback.text}
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm">No tienes selecciones activas.</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowMobileBetSlip(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  Seguir viendo partidos
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceBet} className="space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {betSlip.map((item) => (
                    <div
                      key={item.codigo_partido}
                      className="bg-[#111827] border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="text-[11px] text-slate-400 block">{item.partido_label}</span>
                        <span className="text-sm font-extrabold text-white">
                          {item.nombre_mercado}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[#39FF14] font-mono text-xs font-bold">
                          {item.valor_cuota_congelada.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelection(item.codigo_partido)}
                          className="text-slate-400 hover:text-red-400 text-xs font-bold px-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Método de Pago (Disponible: ${walletBalance.toLocaleString('es-CO')} COP)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Billetera', 'PSE'].map((metodo) => (
                      <button
                        key={metodo}
                        type="button"
                        onClick={() => setOrigenFondos(metodo)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          origenFondos === metodo
                            ? 'bg-[#39FF14]/15 border-[#39FF14] text-[#39FF14]'
                            : 'bg-[#111827] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {metodo === 'Billetera' ? 'Saldo en Billetera' : 'Wompi / PSE'}
                      </button>
                    ))}
                  </div>
                </div>

                {origenFondos === 'PSE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Entidad Bancaria (Pasarela Wompi / PSE)
                    </label>
                    <select
                      value={bancoOrigen}
                      onChange={(e) => setBancoOrigen(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#111827] text-white text-xs rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                    >
                      {BANCOS_PSE.map((banco) => (
                        <option key={banco} value={banco}>
                          {banco}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Monto a Apostar (COP)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111827] text-white font-mono text-sm rounded-xl border border-slate-800 focus:border-[#39FF14] outline-none"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {[10000, 20000, 50000, 100000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStakeAmount(preset)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer"
                      >
                        ${preset / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Cuota Combinada:</span>
                    <span className="font-mono font-bold text-white">{totalOdd.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-200">Posible Ganancia:</span>
                    <span className="text-base font-black text-[#39FF14] font-mono">
                      ${potentialPayout.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>

                {betFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      betFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/40 text-red-300'
                    }`}
                  >
                    {betFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingBet}
                  className="w-full py-3.5 rounded-xl bg-[#39FF14] text-slate-950 font-black text-sm shadow-lg shadow-[#39FF14]/25 hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingBet
                    ? 'Procesando Apuesta...'
                    : origenFondos === 'PSE'
                      ? `Pagar y Apostar con Wompi (${bancoOrigen})`
                      : `Confirmar Apuesta ($${Number(stakeAmount || 0).toLocaleString('es-CO')} COP)`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchesPanel;
