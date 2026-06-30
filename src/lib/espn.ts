import { getCachedData, setCachedData } from './db.js'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const STANDINGS_BASE = 'https://site.api.espn.com/apis/v2/sports/soccer'
const MEXICO_TZ = 'America/Mexico_City'

// ESPN league slugs
const LEAGUE_SLUGS: Record<string, string> = {
  world_cup_2026: 'fifa.world',
  champions_league: 'uefa.champions',
  liga_mx: 'mex.1',
  laliga: 'esp.1',
  premier_league: 'eng.1',
}

export interface ESPNScoreboard {
  events: ESPNEvent[]
  day?: { date: string }
}

export interface ESPNEvent {
  id: string
  uid: string
  date: string
  name: string
  shortName: string
  season?: { year: number; type: number; slug: string }
  competitions: ESPNCompetition[]
  status: {
    clock: number
    displayClock: string
    period: number
    type: { id: string; name: string; state: string; completed: boolean; description: string; detail: string }
  }
}

export interface ESPNCompetition {
  id: string
  date: string
  attendance?: number
  venue?: { id: string; fullName: string; address?: { city: string; country: string } }
  competitors: ESPNCompetitor[]
  groups?: { id: string; name: string; shortName: string }
  situation?: {
    lastPlay?: { text: string }
    down?: number; distance?: number
  }
}

export interface ESPNCompetitor {
  id: string
  uid: string
  type: string
  order: number
  homeAway: 'home' | 'away'
  winner: boolean
  team: {
    id: string; uid: string; location: string; name: string; abbreviation: string
    displayName: string; color?: string; alternateColor?: string
    logo: string; logos?: Array<{ href: string }>
  }
  score: string
  shootoutScore?: number   // penalty-shootout goals (present only when the tie went to penalties)
  statistics?: Array<{ name: string; value: string | number }>
}

async function fetchWithCache<T>(url: string, cacheKey: string, maxAgeMinutes = 5): Promise<T | null> {
  const cached = await getCachedData(cacheKey, maxAgeMinutes)
  if (cached) {
    try { return JSON.parse(cached) as T } catch { /* ignore */ }
  }

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'QuinielaMundial/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json() as T
    await setCachedData(cacheKey, JSON.stringify(data))
    return data
  } catch {
    return null
  }
}

export async function getScoreboard(tournament = 'world_cup_2026', date?: string): Promise<ESPNScoreboard | null> {
  const slug = LEAGUE_SLUGS[tournament] ?? LEAGUE_SLUGS['world_cup_2026']!
  const dateParam = date ? `?dates=${date.replace(/-/g, '')}` : ''
  const url = `${ESPN_BASE}/${slug}/scoreboard${dateParam}`
  const cacheKey = `scoreboard:${slug}:${date ?? 'today'}`
  return fetchWithCache<ESPNScoreboard>(url, cacheKey, 3)
}

export async function getStandings(tournament = 'world_cup_2026'): Promise<unknown> {
  const slug = LEAGUE_SLUGS[tournament] ?? LEAGUE_SLUGS['world_cup_2026']!
  const url = `${STANDINGS_BASE}/${slug}/standings`
  const cacheKey = `standings:${slug}`
  return fetchWithCache<unknown>(url, cacheKey, 30)
}

export interface GroupStanding {
  teamCode: string
  played: number
  won: number
  drawn: number
  lost: number
  gd: number
  gf: number
  points: number
}

export type GroupStandingsMap = Record<string, GroupStanding[]>

export interface CompletedMatch {
  home: string
  away: string
  homeScore: number
  awayScore: number
}

export async function getGroupStandings(tournament = 'world_cup_2026'): Promise<GroupStandingsMap> {
  const raw = await getStandings(tournament) as any
  if (!raw) return {}

  const result: GroupStandingsMap = {}

  // ESPN returns groups either under `children` (grouped) or flat `standings.entries`
  const groups: Array<{ name: string; entries: any[] }> = []

  if (Array.isArray(raw?.children)) {
    for (const child of raw.children) {
      const groupName = (child.abbreviation ?? child.shortName ?? child.name ?? '').replace(/^Group\s*/i, '')
      const entries = child.standings?.entries ?? child.entries ?? []
      if (entries.length) groups.push({ name: groupName, entries })
    }
  } else if (Array.isArray(raw?.standings?.entries)) {
    // Flat list — group by entry.group.shortName
    for (const entry of raw.standings.entries) {
      const groupName = entry.group?.shortName ?? entry.group?.name?.replace(/^Group\s*/i, '') ?? '?'
      let g = groups.find(g => g.name === groupName)
      if (!g) { g = { name: groupName, entries: [] }; groups.push(g) }
      g.entries.push(entry)
    }
  }

  for (const { name, entries } of groups) {
    const standings: GroupStanding[] = entries.map((entry: any) => {
      const abbr = (entry.team?.abbreviation ?? '').toUpperCase()
      const stat = (key: string) => {
        const s = (entry.stats as Array<{ name: string; value: number }> | undefined)
        return s?.find(x => x.name === key)?.value ?? 0
      }
      return {
        teamCode: abbr,
        played: stat('gamesPlayed') || stat('played'),
        won:    stat('wins')  || stat('won'),
        drawn:  stat('ties')  || stat('draws') || stat('drawn'),
        lost:   stat('losses') || stat('lost'),
        gd:     stat('pointDifferential') || stat('goalDifference') || stat('gd'),
        gf:     stat('pointsFor') || stat('goalsFor') || stat('gf'),
        points: stat('points'),
      }
    })
    // Sort by points desc, then GD desc
    standings.sort((a, b) => b.points - a.points || b.gd - a.gd)
    result[name] = standings
  }

  return result
}

// Build a team-code → group-name map from standings (used when ESPN omits groups field)
async function buildTeamGroupMap(tournament: string): Promise<Record<string, string>> {
  const standings = await getGroupStandings(tournament)
  const map: Record<string, string> = {}
  for (const [group, teams] of Object.entries(standings)) {
    for (const team of teams) map[team.teamCode] = group
  }
  return map
}

export async function getGroupFixtures(
  tournament = 'world_cup_2026',
): Promise<Record<string, Array<{ home: string; away: string }>>> {
  const slug = LEAGUE_SLUGS[tournament] ?? LEAGUE_SLUGS['world_cup_2026']!
  const now  = new Date()
  const todayMex  = toMexDateParam(now)
  const futureEnd = toMexDateParam(new Date(now.getTime() + 14 * 86_400_000))

  // Fetch next 2 weeks to capture all remaining group-stage fixtures
  const data = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${todayMex}-${futureEnd}&limit=100`,
    `scoreboard:${slug}:fixtures:${todayMex}`,
    10,
  )

  const teamGroup = await buildTeamGroupMap(tournament)
  const fixtures: Record<string, Array<{ home: string; away: string }>> = {}

  if (!data?.events) return fixtures

  for (const event of data.events) {
    if (event.status.type.state !== 'pre') continue

    const comp = event.competitions?.[0]
    if (!comp?.competitors || comp.competitors.length < 2) continue

    const homeComp = comp.competitors.find(c => c.homeAway === 'home')
    const awayComp = comp.competitors.find(c => c.homeAway === 'away')
    if (!homeComp || !awayComp) continue

    const homeCode = (homeComp.team?.abbreviation ?? '').toUpperCase()
    const awayCode = (awayComp.team?.abbreviation ?? '').toUpperCase()
    if (!homeCode || !awayCode) continue

    // ESPN often omits comp.groups — fall back to standings-derived map.
    // Only use the map when BOTH teams share the same group (excludes knockout placeholders like "3RD").
    const homeGroup = teamGroup[homeCode]
    const awayGroup = teamGroup[awayCode]
    const groupName =
      (comp.groups?.shortName ?? comp.groups?.name ?? '').replace(/^Group\s*/i, '') ||
      (homeGroup && homeGroup === awayGroup ? homeGroup : '')

    if (!groupName) continue

    if (!fixtures[groupName]) fixtures[groupName] = []
    fixtures[groupName].push({ home: homeCode, away: awayCode })
  }

  return fixtures
}

export async function getGroupResults(
  tournament = 'world_cup_2026',
): Promise<Record<string, CompletedMatch[]>> {
  const slug = LEAGUE_SLUGS[tournament] ?? LEAGUE_SLUGS['world_cup_2026']!
  const now  = new Date()
  const todayMex = toMexDateParam(now)
  // Fetch from tournament start to cover all completed matches
  const startMex = toMexDateParam(new Date('2026-06-11T00:00:00'))

  const data = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${startMex}-${todayMex}&limit=200`,
    `scoreboard:${slug}:results:${todayMex}`,
    15,
  )

  const teamGroup = await buildTeamGroupMap(tournament)
  const results: Record<string, CompletedMatch[]> = {}

  if (!data?.events) return results

  for (const event of data.events) {
    if (!event.status.type.completed) continue

    const comp = event.competitions?.[0]
    if (!comp?.competitors || comp.competitors.length < 2) continue

    const homeComp = comp.competitors.find(c => c.homeAway === 'home')
    const awayComp = comp.competitors.find(c => c.homeAway === 'away')
    if (!homeComp || !awayComp) continue

    const homeCode = (homeComp.team?.abbreviation ?? '').toUpperCase()
    const awayCode = (awayComp.team?.abbreviation ?? '').toUpperCase()
    const homeScore = parseInt(homeComp.score ?? '', 10)
    const awayScore = parseInt(awayComp.score ?? '', 10)

    if (!homeCode || !awayCode || isNaN(homeScore) || isNaN(awayScore)) continue

    const groupName =
      (comp.groups?.shortName ?? comp.groups?.name ?? '').replace(/^Group\s*/i, '') ||
      teamGroup[homeCode] ||
      teamGroup[awayCode]

    if (!groupName) continue

    if (!results[groupName]) results[groupName] = []
    results[groupName].push({ home: homeCode, away: awayCode, homeScore, awayScore })
  }

  return results
}

export async function getUpcomingMatches(tournament = 'world_cup_2026'): Promise<ESPNEvent[]> {
  const data = await getScoreboard(tournament)
  return data?.events ?? []
}

// ─── Knockout bracket ──────────────────────────────────────────────────────────

export interface KnockoutMatch {
  home: string            // team code or ESPN placeholder ("BRA", "2F", "3RD", "RD32"…)
  away: string
  homeScore: number | null
  awayScore: number | null
  homeShootout: number | null   // penalty-shootout goals (null unless the tie went to penalties)
  awayShootout: number | null
  state: 'pre' | 'in' | 'post'
  date: string
  loser: string | null    // team code knocked out (uses ESPN winner flag → respects penalties)
}

export interface KnockoutRounds {
  r32: KnockoutMatch[]
  r16: KnockoutMatch[]
  qf: KnockoutMatch[]
  sf: KnockoutMatch[]
  third: KnockoutMatch[]
  final: KnockoutMatch[]
}

// ESPN tags each knockout event with the round via `season.slug`.
const KNOCKOUT_SLUG_MAP: Record<string, keyof KnockoutRounds> = {
  'round-of-32':     'r32',
  'round-of-16':     'r16',
  'quarterfinals':   'qf',
  'semifinals':      'sf',
  '3rd-place-match': 'third',
  'final':           'final',
}

// Date window covering the WC2026 knockout phase (R32 → final).
const KNOCKOUT_WINDOW: Record<string, string> = {
  world_cup_2026: '20260628-20260720',
}

export async function getKnockoutMatches(tournament = 'world_cup_2026'): Promise<KnockoutRounds> {
  const slug = LEAGUE_SLUGS[tournament] ?? LEAGUE_SLUGS['world_cup_2026']!
  const window = KNOCKOUT_WINDOW[tournament] ?? KNOCKOUT_WINDOW['world_cup_2026']!

  const data = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${window}&limit=100`,
    `scoreboard:${slug}:knockout`,
    5,
  )

  const rounds: KnockoutRounds = { r32: [], r16: [], qf: [], sf: [], third: [], final: [] }
  if (!data?.events) return rounds

  // Sort by date so each round's matches keep a stable bracket order.
  const events = [...data.events].sort((a, b) => a.date.localeCompare(b.date))

  for (const event of events) {
    const roundKey = KNOCKOUT_SLUG_MAP[event.season?.slug ?? '']
    if (!roundKey) continue

    const comp = event.competitions?.[0]
    if (!comp?.competitors || comp.competitors.length < 2) continue
    const homeComp = comp.competitors.find(c => c.homeAway === 'home')
    const awayComp = comp.competitors.find(c => c.homeAway === 'away')
    if (!homeComp || !awayComp) continue

    const state = (event.status.type.state as 'pre' | 'in' | 'post') ?? 'pre'
    const hs = parseInt(homeComp.score ?? '', 10)
    const as = parseInt(awayComp.score ?? '', 10)
    const homeCode = (homeComp.team?.abbreviation ?? '').toUpperCase()
    const awayCode = (awayComp.team?.abbreviation ?? '').toUpperCase()

    // Knocked-out team once the match is over. Prefer ESPN's winner flag (it accounts
    // for penalty shootouts); fall back to the score when the flag isn't set yet.
    let loser: string | null = null
    if (state === 'post') {
      if (homeComp.winner === true || awayComp.winner === true) {
        loser = homeComp.winner ? awayCode : homeCode
      } else if (!isNaN(hs) && !isNaN(as) && hs !== as) {
        loser = hs < as ? homeCode : awayCode
      }
    }

    rounds[roundKey].push({
      home: homeCode,
      away: awayCode,
      homeScore: state === 'pre' || isNaN(hs) ? null : hs,
      awayScore: state === 'pre' || isNaN(as) ? null : as,
      homeShootout: typeof homeComp.shootoutScore === 'number' ? homeComp.shootoutScore : null,
      awayShootout: typeof awayComp.shootoutScore === 'number' ? awayComp.shootoutScore : null,
      state,
      date: event.date,
      loser,
    })
  }

  return rounds
}

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// Date param in Mexico City timezone — avoids UTC midnight rollovers cutting off evening games
function toMexDateParam(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MEXICO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d).replace(/-/g, '')
}

// Known tournament start dates — if today is before this, show the opening week instead
const TOURNAMENT_START: Record<string, string> = {
  world_cup_2026: '2026-06-11',
}

export async function getMatchSchedule(tournament = 'world_cup_2026'): Promise<{
  today: ESPNEvent[]
  week: ESPNEvent[]
  previewMode: boolean   // true when showing opening week ahead of time
}> {
  const slug = LEAGUE_SLUGS[tournament] ?? LEAGUE_SLUGS['world_cup_2026']!
  const now  = new Date()

  // Check if we're before the tournament start
  const startStr = TOURNAMENT_START[tournament]
  if (startStr) {
    const startDate = new Date(startStr + 'T00:00:00')
    if (now < startDate) {
      // Show the opening week of the tournament
      const openEnd = new Date(startDate)
      openEnd.setDate(openEnd.getDate() + 6)
      const weekData = await fetchWithCache<ESPNScoreboard>(
        `${ESPN_BASE}/${slug}/scoreboard?dates=${toDateParam(startDate)}-${toDateParam(openEnd)}&limit=50`,
        `scoreboard:${slug}:opening:${toDateParam(startDate)}`,
        120,
      )
      return { today: [], week: weekData?.events ?? [], previewMode: true }
    }
  }

  // Today's matches — use Mexico City date so evening games don't roll over to UTC tomorrow
  const todayMex = toMexDateParam(now)
  const todayData = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${todayMex}`,
    `scoreboard:${slug}:${todayMex}`,
    3,
  )
  const today = todayData?.events ?? []

  // Next 7 days (tomorrow → +7) in Mexico City time
  const from = new Date(now.getTime() + 86_400_000)
  const to   = new Date(now.getTime() + 7 * 86_400_000)
  const weekData = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${toMexDateParam(from)}-${toMexDateParam(to)}&limit=50`,
    `scoreboard:${slug}:week:${todayMex}`,
    60,
  )
  const week = weekData?.events ?? []

  return { today, week, previewMode: false }
}

export function formatMatchTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: MEXICO_TZ,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return dateStr
  }
}

export function formatMatchDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: MEXICO_TZ,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function getMatchStatus(event: ESPNEvent): 'pre' | 'in' | 'post' {
  const state = event.status.type.state
  if (state === 'pre') return 'pre'
  if (state === 'post') return 'post'
  return 'in'
}
