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
    dt_visitante: 'Javier Gandolfi',
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
    dt_local: 'David González',
    dt_visitante: 'Jorge da Silva',
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
    dt_local: 'Alejandro Restrepo',
    dt_visitante: 'Alfredo Arias',
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
    dt_local: 'Pablo Peirano',
    dt_visitante: 'Ismael Rescalvo',
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
    dt_local: 'César Farías',
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
    dt_local: 'Gustavo Florentín',
    dt_visitante: 'Luis Fernando Suárez',
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
    dt_local: 'Bernardo Redín',
    dt_visitante: 'Pablo Peirano',
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
    dt_local: 'Sebastián Oliveros',
    dt_visitante: 'Alejandro Restrepo',
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
    dt_local: 'Javier Gandolfi',
    dt_visitante: 'Pedro Depablos',
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
    dt_local: 'Javier Gandolfi',
    dt_visitante: 'David González',
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
    dt_local: 'Jorge da Silva',
    dt_visitante: 'César Farías',
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

function MatchesPanel({ user }) {
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

  const handleToggleDetails = async (codigoPartido) => {
    if (expandedMatch === codigoPartido) {
      setExpandedMatch(null);
      return;
    }
    setExpandedMatch(codigoPartido);

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
    if (isAdmin) return; // El Administrador no realiza apuestas personales
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

  const removeSelection = (codigoPartido) => {
    setBetSlip((prev) => prev.filter((item) => item.codigo_partido !== codigoPartido));
  };

  const totalOdd = betSlip.reduce((acc, item) => acc * Number(item.valor_cuota_congelada), 1);
  const potentialPayout = betSlip.length > 0 ? Math.round(Number(stakeAmount || 0) * totalOdd) : 0;

  const handlePlaceBet = async (e) => {
    e.preventDefault();
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
          {/* SECCIÓN 1: APUESTAS ACTIVAS (DISEÑO IDÉNTICO A TU REFERENCIA) */}
          {/* ===================================================================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Apuestas Activas
              </h2>
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
            </div>

            {loading ? (
              <div className="bg-[#182232] border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-10 h-10 border-4 border-[#39FF14] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-400 text-sm">Sincronizando partidos en vivo...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                  const isExpanded = expandedMatch === match.codigo_partido;
                  const details = matchDetailsCache[match.codigo_partido] || {
                    alineaciones: [],
                    eventos: [],
                  };

                  // Jugadores del partido (desde /api/sports/players o mercados "Gol: <Jugador>" en PostgreSQL)
                  const matchPlayers = players.filter(
                    (p) => p.nombre_equipo === match.equipo_local || p.nombre_equipo === match.equipo_visitante
                  );
                  const playerGoalMarkets = Object.entries(matchOdds)
                    .filter(([mkt]) => mkt.startsWith('Gol: '))
                    .map(([mkt, val]) => ({
                      market: mkt,
                      playerName: mkt.replace('Gol: ', ''),
                      odd: Number(val),
                    }));

                  // Si aún no hay mercados de jugador en matchOdds, construirlos con los delanteros/volantes del partido
                  const featuredScorers =
                    playerGoalMarkets.length > 0
                      ? playerGoalMarkets.slice(0, 4)
                      : matchPlayers
                          .filter((p) => p.posicion_habitual === 'Delantero' || p.posicion_habitual === 'Volante')
                          .slice(0, 4)
                          .map((p, idx) => ({
                            market: `Gol: ${p.nombre_completo}`,
                            playerName: p.nombre_completo,
                            odd: 2.15 + idx * 0.2,
                          }));

                  return (
                    <article
                      key={match.codigo_partido}
                      className="rounded-2xl bg-[#1c2636] border border-slate-700/60 hover:border-[#39FF14]/50 p-4 flex flex-col justify-between shadow-xl shadow-black/40 transition-all"
                    >
                      {/* Indicador En Vivo / Jornada */}
                      <div className="flex items-center justify-between text-[10px] mb-2">
                        <span className="text-slate-400 font-semibold">
                          {match.nombre_jornada || 'Liga BetPlay'}
                        </span>
                        {match.estado_partido === 'En Vivo' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-[#39FF14] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-ping" />
                            EN VIVO {liveMinute}&apos;
                          </span>
                        ) : (
                          <span className="text-slate-400">{match.estado_partido}</span>
                        )}
                      </div>

                      {/* Cabecera: Escudos, Nombres, Banderas y VS / Marcador */}
                      <div className="grid grid-cols-3 items-center text-center my-1">
                        <div className="flex flex-col items-center">
                          <ClubCrest teamName={match.equipo_local} />
                          <span className="mt-1.5 text-xs font-bold text-slate-100 truncate max-w-[90px]">
                            {localStyle.short}
                          </span>
                          <ColombiaFlag />
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-slate-300 tracking-wider">VS</span>
                          <span className="mt-1 px-2.5 py-0.5 rounded-md bg-[#0f172a] border border-slate-700/80 text-xs font-black text-white font-mono">
                            {match.marcador_local} - {match.marcador_visitante}
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <ClubCrest teamName={match.equipo_visitante} />
                          <span className="mt-1.5 text-xs font-bold text-slate-100 truncate max-w-[90px]">
                            {visStyle.short}
                          </span>
                          <ColombiaFlag />
                        </div>
                      </div>

                      {/* Directores Técnicos Actuales */}
                      {(match.dt_local || match.dt_visitante) && (
                        <div className="mt-1.5 px-2 py-1 rounded-lg bg-[#111827]/80 border border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[48%]" title={`DT ${match.equipo_local}`}>
                            DT: <strong className="text-slate-200">{match.dt_local || 'Por definir'}</strong>
                          </span>
                          <span className="truncate max-w-[48%] text-right" title={`DT ${match.equipo_visitante}`}>
                            DT: <strong className="text-slate-200">{match.dt_visitante || 'Por definir'}</strong>
                          </span>
                        </div>
                      )}

                      {/* Mercados de Apuesta: 1X2 + Goles y Ambos Marcan */}
                      <div className="space-y-1.5 my-3">
                        <div className="grid grid-cols-3 gap-1.5">
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
                                className={`rounded-xl py-1.5 px-1 text-center transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-md shadow-[#39FF14]/30'
                                    : 'bg-[#111827] hover:bg-slate-900 text-white border-slate-800 hover:border-[#39FF14]/50'
                                }`}
                              >
                                <span
                                  className={`block text-[10px] font-medium ${
                                    isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                                  }`}
                                >
                                  {oddBox.label}
                                </span>
                                <span className="block text-xs font-extrabold font-mono mt-0.5">
                                  {Number(oddBox.value).toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Segunda fila de mercados: Más de 2.5, Menos de 2.5 y Ambos Marcan */}
                        <div className="grid grid-cols-3 gap-1.5">
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
                                className={`rounded-xl py-1.5 px-1 text-center transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-md shadow-[#39FF14]/30'
                                    : 'bg-[#0d1526] hover:bg-slate-900 text-white border-slate-800/90 hover:border-[#39FF14]/50'
                                }`}
                              >
                                <span
                                  className={`block text-[9px] font-medium truncate ${
                                    isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                                  }`}
                                >
                                  {oddBox.label}
                                </span>
                                <span className="block text-xs font-extrabold font-mono mt-0.5">
                                  {Number(oddBox.value).toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mercados de Jugadores: Goleador en Cualquier Momento */}
                      {featuredScorers.length > 0 && (
                        <div className="my-1.5 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39FF14]">
                              ⚽ Apuesta Jugador (Anota Gol)
                            </span>
                            <span className="text-[9px] text-slate-400">1 clic al cupón</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {featuredScorers.map((sc) => {
                              const isSelected = selectedLine?.nombre_mercado === sc.market;
                              return (
                                <button
                                  key={sc.market}
                                  type="button"
                                  onClick={() => handleSelectOdd(match, sc.market, sc.odd)}
                                  className={`rounded-xl py-1.5 px-2 flex items-center justify-between gap-1 text-left transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-md shadow-[#39FF14]/30'
                                      : 'bg-[#111827] hover:bg-slate-900 text-white border-slate-800 hover:border-[#39FF14]/50'
                                  }`}
                                >
                                  <span
                                    className={`text-[10px] font-bold truncate ${
                                      isSelected ? 'text-slate-950' : 'text-slate-200'
                                    }`}
                                    title={sc.playerName}
                                  >
                                    {sc.playerName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-extrabold font-mono shrink-0 ${
                                      isSelected ? 'text-slate-950' : 'text-[#39FF14]'
                                    }`}
                                  >
                                    {Number(sc.odd).toFixed(2)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Botón para ver Alineaciones Titulares, DTs y Eventos del Partido */}
                      <button
                        type="button"
                        onClick={() => handleToggleDetails(match.codigo_partido)}
                        className="mt-2.5 w-full rounded-xl bg-[#111827] hover:bg-slate-900 border border-slate-800/90 hover:border-[#39FF14]/50 px-3 py-2 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <span className="font-bold text-slate-200">
                          {isExpanded ? 'Ocultar Plantilla e Incidencias' : 'Ver Plantilla, DTs e Incidencias'}
                        </span>
                        <span className="text-[#39FF14] font-extrabold">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Controles rápidos de marcador en vivo para el Administrador */}
                      {isAdmin && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateLiveScore(match, -1, 0, 'En Vivo')}
                              className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                              title="Restar 1 gol al local"
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
                              className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                              title="Restar 1 gol al visitante"
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
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            {match.estado_partido === 'En Vivo' ? 'Finalizar' : 'Poner En Vivo'}
                          </button>
                        </div>
                      )}

                      {/* Desplegable de Eventos, Directores Técnicos y Alineaciones con Apuestas por Jugador */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] space-y-3 bg-slate-950/90 p-3 rounded-xl">
                          <div className="space-y-1 border-b border-slate-800 pb-2">
                            <p className="font-bold text-[#39FF14]">
                              🏟️ {match.nombre_estadio} • Árbitro: {match.arbitro || 'Designado'}
                            </p>
                            <div className="flex justify-between text-[10px] text-slate-300">
                              <span>
                                DT {localStyle.short}: <strong className="text-white">{match.dt_local || 'Activo'}</strong>
                              </span>
                              <span>
                                DT {visStyle.short}: <strong className="text-white">{match.dt_visitante || 'Activo'}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Plantilla de Jugadores del Partido + Cuotas de Gol y Tarjeta */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block">
                              Plantilla de Jugadores y Mercados Individuales:
                            </span>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {(details.alineaciones?.length > 0 ? details.alineaciones : matchPlayers).map((jug) => {
                                const nombreJug = jug.nombre_jugador || jug.nombre_completo;
                                const mktGol = `Gol: ${nombreJug}`;
                                const mktTarjeta = `Tarjeta: ${nombreJug}`;
                                const cuotaGol =
                                  matchOdds[mktGol] ||
                                  (jug.posicion_habitual === 'Delantero'
                                    ? 2.25
                                    : jug.posicion_habitual === 'Volante'
                                      ? 2.95
                                      : 4.5);
                                const cuotaTarjeta = matchOdds[mktTarjeta] || 3.2;
                                const isGolSelected = selectedLine?.nombre_mercado === mktGol;
                                const isCardSelected = selectedLine?.nombre_mercado === mktTarjeta;
                                const esLocal = jug.nombre_equipo === match.equipo_local;

                                return (
                                  <div
                                    key={jug.documento_jugador || nombreJug}
                                    className="flex items-center justify-between gap-1.5 bg-[#111827] border border-slate-800/80 rounded-lg px-2 py-1.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-white block truncate text-[10px]">
                                        {nombreJug}
                                      </span>
                                      <span className="text-[9px] text-slate-400 block truncate">
                                        {esLocal ? localStyle.short : visStyle.short} • {jug.posicion_habitual}
                                      </span>
                                    </div>

                                    {isAdmin ? (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateLiveScore(
                                              match,
                                              esLocal ? 1 : 0,
                                              esLocal ? 0 : 1,
                                              'En Vivo',
                                              jug.documento_jugador,
                                              'Gol'
                                            )
                                          }
                                          className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[#39FF14] text-[9px] font-bold cursor-pointer"
                                          title="Registrar Gol de este jugador"
                                        >
                                          +⚽ Gol
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
                                          className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold cursor-pointer"
                                          title="Registrar Tarjeta Amarilla a este jugador"
                                        >
                                          +🟨 Tarj
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 shrink-0">
                                        {jug.posicion_habitual !== 'Portero' && (
                                          <button
                                            type="button"
                                            onClick={() => handleSelectOdd(match, mktGol, cuotaGol)}
                                            className={`px-2 py-0.5 rounded text-[9px] font-extrabold font-mono border transition cursor-pointer ${
                                              isGolSelected
                                                ? 'bg-[#39FF14] text-slate-950 border-[#39FF14]'
                                                : 'bg-slate-900 hover:border-[#39FF14] text-[#39FF14] border-slate-700'
                                            }`}
                                            title={`Apostar a que ${nombreJug} anota gol`}
                                          >
                                            ⚽ {Number(cuotaGol).toFixed(2)}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleSelectOdd(match, mktTarjeta, cuotaTarjeta)}
                                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold font-mono border transition cursor-pointer ${
                                            isCardSelected
                                              ? 'bg-[#39FF14] text-slate-950 border-[#39FF14]'
                                              : 'bg-slate-900 hover:border-amber-400 text-amber-300 border-slate-700'
                                          }`}
                                          title={`Apostar a que ${nombreJug} recibe tarjeta`}
                                        >
                                          🟨 {Number(cuotaTarjeta).toFixed(2)}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Cronología de Incidencias en Vivo */}
                          <div className="space-y-1 border-t border-slate-800 pt-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block">
                              Incidencias del Partido:
                            </span>
                            {details.eventos?.length > 0 ? (
                              details.eventos.map((ev, i) => (
                                <div key={i} className="text-slate-300 flex items-center justify-between text-[10px]">
                                  <span>
                                    <strong className="text-[#39FF14] font-mono">{ev.minuto_ocurrencia}&apos;</strong>{' '}
                                    {ev.nombre_evento === 'Gol' ? '⚽ Gol' : '🟨 Tarjeta'} —{' '}
                                    <strong className="text-white">{ev.nombre_jugador}</strong>
                                  </span>
                                  <span className="text-slate-500 text-[9px]">{ev.nombre_equipo}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-500 text-[10px]">Sin goles ni tarjetas registradas aún.</p>
                            )}
                          </div>
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
        {/* COLUMNA DERECHA: CONSOLA DEPORTIVA (ADMIN) O CUPÓN DE APUESTA (USUARIO) */}
        {/* ===================================================================== */}
        <aside className="space-y-6 lg:sticky lg:top-20">
          {isAdmin ? (
            <div className="bg-[#1c2636] border border-slate-700/70 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#39FF14]"></span>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                    Consola de Control Deportivo
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-[#39FF14] text-[10px] font-bold">
                  Solo Admin
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Como <strong className="text-[#39FF14]">Administrador</strong>, tu cuenta está dedicada exclusivamente a la operación de la consola (sin billetera ni apuestas personales).
              </p>

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
          ) : (
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
                    Selecciona cualquier cuota (`Loc.`, `Emp.` o `Vis.`) en las tarjetas de Apuestas Activas.
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
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${origenFondos === metodo
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
                  className={`mt-4 p-3 rounded-xl text-xs border ${betFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                >
                  {betFeedback.text}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default MatchesPanel;
