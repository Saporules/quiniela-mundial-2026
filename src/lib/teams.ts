import type { Team, Tier } from '../types/index.js'

export interface TeamInfo {
  fifaRank: number
  winProb: string
  summary: string
}

export const TEAM_INFO: Record<string, TeamInfo> = {
  // ── FAVORITOS ────────────────────────────────────────────────────────────
  ARG: { fifaRank: 1,  winProb: '14%',   summary: 'Campeón vigente de Qatar 2022. La generación post-Messi, liderada por Álvarez, Mac Allister y Di María, llega con hambre de bicampeonato.' },
  ESP: { fifaRank: 2,  winProb: '12%',   summary: 'Campeones de la Eurocopa 2024. Yamal y Nico Williams representan la nueva generación dorada; juegan el mejor fútbol del mundo.' },
  FRA: { fifaRank: 3,  winProb: '11%',   summary: 'Finalistas en 2022. Mbappé en su plenitud, con plantilla profunda y talento de clase mundial en cada línea.' },
  BRA: { fifaRank: 5,  winProb: '10%',   summary: 'Cinco veces campeones buscando redención. Vinicius Jr. y Rodrygo lideran una carga ofensiva que puede hacer historia.' },
  ENG: { fifaRank: 4,  winProb: '9%',    summary: 'Finalistas en 2021 y semifinalistas en 2018 y 2022. Bellingham, Saka y Foden forman uno de los mejores ataques del torneo.' },
  GER: { fifaRank: 6,  winProb: '8%',    summary: 'Cuatro veces campeones con hambre de más. Kimmich y Wirtz lideran una renovación que mostró su nivel en casa durante la Euro 2024.' },
  POR: { fifaRank: 7,  winProb: '6%',    summary: 'La era post-Ronaldo en plena construcción. Bruno Fernandes y Bernardo Silva llevan la batuta de un equipo con talento de sobra.' },
  NED: { fifaRank: 8,  winProb: '5%',    summary: 'Semifinalistas en 2022. Van Dijk y Gakpo encabezan un equipo sólido que nunca ha ganado el Mundial pero siempre compite.' },
  // ── CREYENTES ────────────────────────────────────────────────────────────
  COL: { fifaRank: 9,  winProb: '3%',    summary: 'Finalistas Copa América 2024 invictos. James Rodríguez sigue siendo el motor de una selección que llega en su mejor momento histórico.' },
  URU: { fifaRank: 16, winProb: '2%',    summary: 'Doble campeón histórico. Núñez y Valverde conforman una generación con calidad real para dar sorpresas en cualquier instancia.' },
  CRO: { fifaRank: 11, winProb: '2%',    summary: 'Subcampeones en 2018, terceros en 2022. Modric en su probable último Mundial; su experiencia puede marcar la diferencia.' },
  USA: { fifaRank: 13, winProb: '2%',    summary: 'Coanfitriones en plena explosión futbolística. Pulisic, McKennie y Reyna lideran ante millones de locales en los estadios más grandes.' },
  MAR: { fifaRank: 10, winProb: '1.5%',  summary: 'La revelación de Qatar 2022 llegando a semifinales. En-Nesyri y Hakimi buscan repetir y superar la hazaña que sacudió al mundo árabe.' },
  JPN: { fifaRank: 15, winProb: '1%',    summary: 'Eliminaron a Alemania y España en Qatar 2022. Disciplinados, intensos y capaces de sorprender a cualquier rival en fase de grupos.' },
  BEL: { fifaRank: 22, winProb: '1%',    summary: 'Generación dorada en declive pero aún peligrosa. De Bruyne y Tielemans se juegan su última gran oportunidad mundialista.' },
  SUI: { fifaRank: 19, winProb: '0.7%',  summary: 'Los suizos siempre sorprenden. Xhaka es el motor de un equipo hábil para los octavos, aunque raramente va más lejos.' },
  MEX: { fifaRank: 14, winProb: '0.5%',  summary: 'Coanfitrión con el peso del maleficio del quinto partido. Busca romper la barrera de octavos ante su propia afición en un Mundial histórico.' },
  SEN: { fifaRank: 17, winProb: '0.5%',  summary: 'Campeones de África en 2022. Mendy y Diatta lideran la selección más temida del continente; capaces de llegar a cuartos de final.' },
  KOR: { fifaRank: 20, winProb: '0.4%',  summary: 'Semifinalistas en 2002 en casa. Son Heung-min, en su probable última Copa del Mundo, puede ser el factor diferencial para avanzar.' },
  TUR: { fifaRank: 25, winProb: '0.4%',  summary: 'Terceros en 2002 y en alza reciente. Demiral y Calhanoglu encabezan un equipo con potencial para sorprender en la fase de grupos.' },
  CAN: { fifaRank: 29, winProb: '0.3%',  summary: 'Segunda Copa del Mundo consecutiva tras 36 años de ausencia. Davies y David construyen la era dorada del fútbol canadiense.' },
  ECU: { fifaRank: 44, winProb: '0.2%',  summary: 'Dos mundiales seguidos con carácter y orden. Caicedo y Preciado representan la nueva ola ecuatoriana que juega sin complejos.' },
  NOR: { fifaRank: 12, winProb: '1.2%',  summary: 'Haaland lidera la generación más talentosa de Noruega en décadas. Con el mejor delantero del mundo, ningún rival puede dormirse.' },
  SWE: { fifaRank: 21, winProb: '0.5%',  summary: 'Isak y Kulusevski representan el relevo generacional sueco. Siempre competitivos, buscan igualar las hazañas históricas del país.' },
  // ── MALETAS ──────────────────────────────────────────────────────────────
  AUT: { fifaRank: 24, winProb: '0.4%',  summary: 'Gregoritsch y Sabitzer llevan el peso ofensivo de una selección que llegó a su mejor nivel reciente en la Eurocopa 2024.' },
  SCO: { fifaRank: 31, winProb: '0.1%',  summary: 'Primer Mundial desde 1998. Robertson lidera a una Escocia emocionada, solidaria y con poco margen para soñar en grande.' },
  PAN: { fifaRank: 48, winProb: '0.05%', summary: 'Segunda Copa del Mundo en su historia. El logro de clasificar ya es el objetivo cumplido; avanzar sería un milagro bienvenido.' },
  EGY: { fifaRank: 38, winProb: '0.1%',  summary: 'Mo Salah puede ser el factor diferencial que lleve a Egipto más allá de la fase de grupos en su retorno a la Copa del Mundo.' },
  CIV: { fifaRank: 46, winProb: '0.2%',  summary: 'Campeones de África en 2024. Haller busca liderar una generación de Costa de Marfil que quiere dejar por primera vez huella mundialista.' },
  COD: { fifaRank: 57, winProb: '0.05%', summary: 'El gigante dormido del fútbol africano. Talento hay, pero la irregularidad histórica les impide consolidarse como fuerza mundial.' },
  RSA: { fifaRank: 58, winProb: '0.03%', summary: 'Organizadores en 2010, jugadores en 2026. Percy Tau busca ser el catalizador de un Bafana Bafana con más corazón que recursos.' },
  ALG: { fifaRank: 34, winProb: '0.1%',  summary: 'Campeones de África en 2019. Mahrez en el ocaso pero aún decisivo para los Zorros del Desierto en su regreso a un Mundial.' },
  IRN: { fifaRank: 21, winProb: '0.3%',  summary: 'El más fuerte de Asia. Taremi lidera un equipo organizado, físico y difícil de golear que puede dar más de un susto.' },
  KSA: { fifaRank: 53, winProb: '0.05%', summary: 'Ganaron a Argentina en Qatar 2022. Con la inyección del dinero de la Saudi Pro League, buscan repetir la sorpresa de su vida.' },
  AUS: { fifaRank: 23, winProb: '0.2%',  summary: 'Los Socceroos tienen tradición mundialista. Leckie y Ryan mantienen el nivel para competir en la fase de grupos con opciones reales.' },
  JOR: { fifaRank: 88, winProb: '0.02%', summary: 'Primera clasificación mundialista de Jordania. El orgullo histórico de estar aquí supera cualquier expectativa de resultado.' },
  IRQ: { fifaRank: 63, winProb: '0.03%', summary: 'Histórico del fútbol asiático que clasificó con mérito tras 21 partidos en 28 meses. El salto al nivel mundialista es el mayor desafío de su historia.' },
  QAT: { fifaRank: 62, winProb: '0.03%', summary: 'Organizadores en 2022 que no ganaron ningún partido. Sin la ventaja de local, el desafío de competir en el Mundial es aún mayor.' },
  NZL: { fifaRank: 97, winProb: '0.02%', summary: 'Habituales del repechaje y primera garantía histórica de OFC. Wood puede marcar algún gol memorable, pero la profundidad de plantilla es limitada.' },
  PAR: { fifaRank: 61, winProb: '0.08%', summary: 'Paraguay regresa al Mundial con su sólida tradición defensiva. Almirón aporta creatividad a un equipo que no tiene nada que perder.' },
  HAI: { fifaRank: 83, winProb: '0.02%', summary: 'Regresa al Mundial con pasión y poco presupuesto. Su clasificación fue una de las grandes sorpresas de CONCACAF.' },
  CUR: { fifaRank: 115, winProb: '0.01%', summary: 'La nación más pequeña de la historia en clasificar a un Mundial. Un logro histórico que trasciende cualquier resultado posible.' },
  TUN: { fifaRank: 35, winProb: '0.08%', summary: 'Los Águilas de Cartago regresan. Khazri y Msakni aportan experiencia a un equipo que aspira a sobrevivir en la fase de grupos.' },
  GHA: { fifaRank: 66, winProb: '0.05%', summary: 'Las Estrellas Negras tienen ADN mundialista (cuartos de final en 2010). Semenyo y Kudus lideran la nueva generación ghanesa.' },
  CPV: { fifaRank: 72, winProb: '0.03%', summary: 'Debutantes y la gran sorpresa de CAF. Ryan Mendes encabeza una selección que representó un auténtico milagro clasificatorio.' },
  UZB: { fifaRank: 74, winProb: '0.03%', summary: 'Debut histórico de Asia Central. Técnicos y rápidos, sorprendieron en la clasificación asiática y llegan como la carta salvaje de la AFC.' },
  CZE: { fifaRank: 36, winProb: '0.1%',  summary: 'Schick y Souček lideran una República Checa con pedigree europeo. Difíciles de vencer, aunque raramente brillan en Mundiales.' },
  BIH: { fifaRank: 55, winProb: '0.05%', summary: 'Džeko en el crepúsculo de su carrera busca dejar huella en su primer Mundial. Bosnia llega con hambre y una afición que vibra.' },
}

export const TEAMS: Team[] = [
  // ── FAVORITOS (8) ────────────────────────────────────────────────────────
  { code: 'ARG', name: 'Argentina',        flag: '🇦🇷', confederation: 'CONMEBOL', tier: 'favorito', fifaRank: 1 },
  { code: 'FRA', name: 'Francia',          flag: '🇫🇷', confederation: 'UEFA',     tier: 'favorito', fifaRank: 3 },
  { code: 'ENG', name: 'Inglaterra',       flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA',     tier: 'favorito', fifaRank: 4 },
  { code: 'BRA', name: 'Brasil',           flag: '🇧🇷', confederation: 'CONMEBOL', tier: 'favorito', fifaRank: 5 },
  { code: 'ESP', name: 'España',           flag: '🇪🇸', confederation: 'UEFA',     tier: 'favorito', fifaRank: 2 },
  { code: 'GER', name: 'Alemania',         flag: '🇩🇪', confederation: 'UEFA',     tier: 'favorito', fifaRank: 10 },
  { code: 'POR', name: 'Portugal',         flag: '🇵🇹', confederation: 'UEFA',     tier: 'favorito', fifaRank: 5 },
  { code: 'NED', name: 'Países Bajos',     flag: '🇳🇱', confederation: 'UEFA',     tier: 'favorito', fifaRank: 8 },

  // ── CREYENTES (16) ───────────────────────────────────────────────────────
  { code: 'COL', name: 'Colombia',         flag: '🇨🇴', confederation: 'CONMEBOL', tier: 'creyente', fifaRank: 13 },
  { code: 'URU', name: 'Uruguay',          flag: '🇺🇾', confederation: 'CONMEBOL', tier: 'creyente', fifaRank: 16 },
  { code: 'CRO', name: 'Croacia',          flag: '🇭🇷', confederation: 'UEFA',     tier: 'creyente', fifaRank: 11 },
  { code: 'USA', name: 'Estados Unidos',   flag: '🇺🇸', confederation: 'CONCACAF', tier: 'creyente', fifaRank: 17 },
  { code: 'MAR', name: 'Marruecos',        flag: '🇲🇦', confederation: 'CAF',      tier: 'creyente', fifaRank: 7 },
  { code: 'JPN', name: 'Japón',            flag: '🇯🇵', confederation: 'AFC',      tier: 'creyente', fifaRank: 18 },
  { code: 'BEL', name: 'Bélgica',          flag: '🇧🇪', confederation: 'UEFA',     tier: 'creyente', fifaRank: 9 },
  { code: 'SUI', name: 'Suiza',            flag: '🇨🇭', confederation: 'UEFA',     tier: 'creyente', fifaRank: 19 },
  { code: 'MEX', name: 'México',           flag: '🇲🇽', confederation: 'CONCACAF', tier: 'creyente', fifaRank: 14 },
  { code: 'SEN', name: 'Senegal',          flag: '🇸🇳', confederation: 'CAF',      tier: 'creyente', fifaRank: 15 },
  { code: 'KOR', name: 'Corea del Sur',    flag: '🇰🇷', confederation: 'AFC',      tier: 'creyente', fifaRank: 25 },
  { code: 'TUR', name: 'Turquía',          flag: '🇹🇷', confederation: 'UEFA',     tier: 'creyente', fifaRank: 22 },
  { code: 'CAN', name: 'Canadá',           flag: '🇨🇦', confederation: 'CONCACAF', tier: 'creyente', fifaRank: 30 },
  { code: 'ECU', name: 'Ecuador',          flag: '🇪🇨', confederation: 'CONMEBOL', tier: 'creyente', fifaRank: 23 },
  { code: 'NOR', name: 'Noruega',          flag: '🇳🇴', confederation: 'UEFA',     tier: 'creyente', fifaRank: 12 },
  { code: 'SWE', name: 'Suecia',           flag: '🇸🇪', confederation: 'UEFA',     tier: 'creyente', fifaRank: 21 },

  // ── MALETAS (24) ─────────────────────────────────────────────────────────
  { code: 'AUT', name: 'Austria',          flag: '🇦🇹', confederation: 'UEFA',     tier: 'maleta', fifaRank: 24 },
  { code: 'SCO', name: 'Escocia',          flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA',     tier: 'maleta', fifaRank: 42 },
  { code: 'CZE', name: 'Chequia',          flag: '🇨🇿', confederation: 'UEFA',     tier: 'maleta', fifaRank: 39 },
  { code: 'BIH', name: 'Bosnia',           flag: '🇧🇦', confederation: 'UEFA',     tier: 'maleta', fifaRank: 64 },
  { code: 'PAN', name: 'Panamá',           flag: '🇵🇦', confederation: 'CONCACAF', tier: 'maleta', fifaRank: 34 },
  { code: 'HAI', name: 'Haití',            flag: '🇭🇹', confederation: 'CONCACAF', tier: 'maleta', fifaRank: 83 },
  { code: 'CUR', name: 'Curazao',          flag: '🇨🇼', confederation: 'CONCACAF', tier: 'maleta', fifaRank: 82 },
  { code: 'PAR', name: 'Paraguay',         flag: '🇵🇾', confederation: 'CONMEBOL', tier: 'maleta', fifaRank: 40 },
  { code: 'EGY', name: 'Egipto',           flag: '🇪🇬', confederation: 'CAF',      tier: 'maleta', fifaRank: 29 },
  { code: 'CIV', name: 'Costa de Marfil',  flag: '🇨🇮', confederation: 'CAF',      tier: 'maleta', fifaRank: 33 },
  { code: 'COD', name: 'Congo DR',         flag: '🇨🇩', confederation: 'CAF',      tier: 'maleta', fifaRank: 45 },
  { code: 'RSA', name: 'Sudáfrica',        flag: '🇿🇦', confederation: 'CAF',      tier: 'maleta', fifaRank: 60 },
  { code: 'ALG', name: 'Argelia',          flag: '🇩🇿', confederation: 'CAF',      tier: 'maleta', fifaRank: 28 },
  { code: 'TUN', name: 'Túnez',            flag: '🇹🇳', confederation: 'CAF',      tier: 'maleta', fifaRank: 46 },
  { code: 'GHA', name: 'Ghana',            flag: '🇬🇭', confederation: 'CAF',      tier: 'maleta', fifaRank: 73 },
  { code: 'CPV', name: 'Cabo Verde',       flag: '🇨🇻', confederation: 'CAF',      tier: 'maleta', fifaRank: 67 },
  { code: 'IRN', name: 'Irán',             flag: '🇮🇷', confederation: 'AFC',      tier: 'maleta', fifaRank: 20 },
  { code: 'KSA', name: 'Arabia Saudita',   flag: '🇸🇦', confederation: 'AFC',      tier: 'maleta', fifaRank: 61 },
  { code: 'AUS', name: 'Australia',        flag: '🇦🇺', confederation: 'AFC',      tier: 'maleta', fifaRank: 27 },
  { code: 'JOR', name: 'Jordania',         flag: '🇯🇴', confederation: 'AFC',      tier: 'maleta', fifaRank: 63 },
  { code: 'IRQ', name: 'Irak',             flag: '🇮🇶', confederation: 'AFC',      tier: 'maleta', fifaRank: 56 },
  { code: 'QAT', name: 'Qatar',            flag: '🇶🇦', confederation: 'AFC',      tier: 'maleta', fifaRank: 57 },
  { code: 'UZB', name: 'Uzbekistán',       flag: '🇺🇿', confederation: 'AFC',      tier: 'maleta', fifaRank: 51 },
  { code: 'NZL', name: 'Nueva Zelanda',    flag: '🇳🇿', confederation: 'OFC',      tier: 'maleta', fifaRank: 85 },
]

export const TEAM_MAP = new Map<string, Team>(TEAMS.map(t => [t.code, t]))

export function getTeamsByTier(tier: Tier): Team[] {
  return TEAMS.filter(t => t.tier === tier)
}

export function getTeam(code: string): Team | undefined {
  return TEAM_MAP.get(code)
}

export const WC2026_GROUPS: Record<string, string[]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUR', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
}

export const TIER_CONFIG = {
  favorito: { label: 'Favoritos',  icon: 'ph-fill ph-star',      color: 'wc-gold',  extraPrice: 150 },
  creyente: { label: 'Creyentes',  icon: 'ph-fill ph-fire',      color: 'blue-400', extraPrice: 100 },
  maleta:   { label: 'Maletas',    icon: 'ph ph-briefcase',      color: 'wc-muted', extraPrice: 50  },
} as const

export function getFifaRank(code: string): number {
  const team = getTeam(code)
  return team?.fifaRank ?? 999
}
