import { useState } from 'react';

// Catálogo oficial de escudos de la Liga BetPlay Dimayor (almacenados en /public/escudos/*.png)
export const CLUB_CREST_DATA = {
  'Atlético Nacional': {
    slug: 'nacional',
    localImg: '/escudos/nacional.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5264.png',
    short: 'Nacional',
  },
  'Atlético Nacional S.A': {
    slug: 'nacional',
    localImg: '/escudos/nacional.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5264.png',
    short: 'Nacional',
  },
  'Millonarios FC': {
    slug: 'millonarios',
    localImg: '/escudos/millonarios.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5484.png',
    short: 'Millonarios',
  },
  'América de Cali': {
    slug: 'america',
    localImg: '/escudos/america.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/8109.png',
    short: 'América',
  },
  'Junior de Barranquilla': {
    slug: 'junior',
    localImg: '/escudos/junior.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/4815.png',
    short: 'Junior',
  },
  'Once Caldas': {
    slug: 'oncecaldas',
    localImg: '/escudos/oncecaldas.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/2919.png',
    short: 'Once Caldas',
  },
  'Once Caldas Manizales': {
    slug: 'oncecaldas',
    localImg: '/escudos/oncecaldas.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/2919.png',
    short: 'Once Caldas',
  },
  'Independiente Santa Fe': {
    slug: 'santafe',
    localImg: '/escudos/santafe.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5488.png',
    short: 'Santa Fe',
  },
  'Independiente Medellín': {
    slug: 'medellin',
    localImg: '/escudos/medellin.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/2690.png',
    short: 'Medellín',
  },
  'Deportivo Cali': {
    slug: 'cali',
    localImg: '/escudos/cali.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/2672.png',
    short: 'Dep. Cali',
  },
  'Deportes Tolima': {
    slug: 'tolima',
    localImg: '/escudos/tolima.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5489.png',
    short: 'Tolima',
  },
  'Atlético Bucaramanga': {
    slug: 'bucaramanga',
    localImg: '/escudos/bucaramanga.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/6137.png',
    short: 'Bucaramanga',
  },
  'Deportivo Pereira': {
    slug: 'pereira',
    localImg: '/escudos/pereira.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5486.png',
    short: 'Pereira',
  },
  'Deportivo Pasto': {
    slug: 'pasto',
    localImg: '/escudos/pasto.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5485.png',
    short: 'Pasto',
  },
  'Cúcuta Deportivo': {
    slug: 'cucuta',
    localImg: '/escudos/cucuta.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/6101.png',
    short: 'Cúcuta',
  },
  'Boyacá Chicó': {
    slug: 'chico',
    localImg: '/escudos/chico.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5480.png',
    short: 'Boyacá Chicó',
  },
  'Fortaleza FC': {
    slug: 'fortaleza',
    localImg: '/escudos/fortaleza.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/4928.png',
    short: 'Fortaleza',
  },
  'Águilas Doradas Rionegro': {
    slug: 'aguilas',
    localImg: '/escudos/aguilas.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/9762.png',
    short: 'Águilas Doradas',
  },
};

export function getClubInfo(teamName = '') {
  if (CLUB_CREST_DATA[teamName]) return CLUB_CREST_DATA[teamName];

  const lower = teamName.toLowerCase();
  if (lower.includes('nacional')) return CLUB_CREST_DATA['Atlético Nacional'];
  if (lower.includes('millonarios')) return CLUB_CREST_DATA['Millonarios FC'];
  if (lower.includes('américa') || lower.includes('america')) return CLUB_CREST_DATA['América de Cali'];
  if (lower.includes('junior')) return CLUB_CREST_DATA['Junior de Barranquilla'];
  if (lower.includes('once')) return CLUB_CREST_DATA['Once Caldas'];
  if (lower.includes('santa fe')) return CLUB_CREST_DATA['Independiente Santa Fe'];
  if (lower.includes('medellín') || lower.includes('medellin')) return CLUB_CREST_DATA['Independiente Medellín'];
  if (lower.includes('cali')) return CLUB_CREST_DATA['Deportivo Cali'];
  if (lower.includes('tolima')) return CLUB_CREST_DATA['Deportes Tolima'];
  if (lower.includes('bucaramanga')) return CLUB_CREST_DATA['Atlético Bucaramanga'];
  if (lower.includes('pereira')) return CLUB_CREST_DATA['Deportivo Pereira'];
  if (lower.includes('pasto')) return CLUB_CREST_DATA['Deportivo Pasto'];
  if (lower.includes('cúcuta') || lower.includes('cucuta')) return CLUB_CREST_DATA['Cúcuta Deportivo'];
  if (lower.includes('chicó') || lower.includes('chico')) return CLUB_CREST_DATA['Boyacá Chicó'];
  if (lower.includes('fortaleza')) return CLUB_CREST_DATA['Fortaleza FC'];
  if (lower.includes('águilas') || lower.includes('aguilas')) return CLUB_CREST_DATA['Águilas Doradas Rionegro'];

  return {
    slug: 'nacional',
    localImg: '/escudos/nacional.png',
    cdnImg: 'https://a.espncdn.com/i/teamlogos/soccer/500/5264.png',
    short: teamName || 'Club',
  };
}

function TeamShield({ teamName, customUrl = null, size = 'md', muted = false }) {
  const [useCdn, setUseCdn] = useState(false);
  const club = getClubInfo(teamName);

  const sizeClasses =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
      ? 'w-12 h-12'
      : 'w-9 h-9';

  const imgSrc = customUrl || (useCdn ? club.cdnImg : club.localImg);

  return (
    <div
      className={`${sizeClasses} shrink-0 flex items-center justify-center relative select-none drop-shadow-md ${
        muted ? 'opacity-75 grayscale-[30%]' : ''
      }`}
      title={teamName}
    >
      <img
        src={imgSrc}
        alt={teamName}
        onError={() => {
          if (!useCdn && club.cdnImg) setUseCdn(true);
        }}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default TeamShield;
