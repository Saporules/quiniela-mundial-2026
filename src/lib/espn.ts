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

export async function getGroupFixtures(
  tournament = 'world_cup_2026',
): Promise<Record<string, Array<{ home: string; away: string }>>> {
  const data = await getScoreboard(tournament)
  const fixtures: Record<string, Array<{ home: string; away: string }>> = {}

  if (!data?.events) return fixtures

  for (const event of data.events) {
    if (event.status.type.state !== 'pre') continue

    const comp = event.competitions?.[0]
    if (!comp?.groups || !comp.competitors || comp.competitors.length < 2) continue

    const groupName =
      (comp.groups?.shortName ?? comp.groups?.name ?? '').replace(/^Group\s*/i, '') || '?'

    const [home, away] = comp.competitors
    const homeCode = (home?.team?.abbreviation ?? '').toUpperCase()
    const awayCode = (away?.team?.abbreviation ?? '').toUpperCase()

    if (!homeCode || !awayCode) continue

    if (!fixtures[groupName]) fixtures[groupName] = []
    fixtures[groupName].push({ home: homeCode, away: awayCode })
  }

  return fixtures
}

export async function getUpcomingMatches(tournament = 'world_cup_2026'): Promise<ESPNEvent[]> {
  const data = await getScoreboard(tournament)
  return data?.events ?? []
}

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
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

  // Today's matches
  const todayData = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${toDateParam(now)}`,
    `scoreboard:${slug}:${toDateParam(now)}`,
    3,
  )
  const today = todayData?.events ?? []

  // Next 7 days (tomorrow → +7)
  const from = new Date(now); from.setDate(from.getDate() + 1)
  const to   = new Date(now); to.setDate(to.getDate() + 7)
  const weekData = await fetchWithCache<ESPNScoreboard>(
    `${ESPN_BASE}/${slug}/scoreboard?dates=${toDateParam(from)}-${toDateParam(to)}&limit=50`,
    `scoreboard:${slug}:week:${toDateParam(now)}`,
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
