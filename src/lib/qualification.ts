import type { GroupStanding, GroupStandingsMap } from './espn.js'
import { getFifaRank } from './teams.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RemainingMatch {
  home: string
  away: string
}

export type MatchOutcome = 'win' | 'draw' | 'loss'

export type RenderStatus = 'qualified' | 'contending' | 'third' | 'eliminated' | 'none'

export interface TeamQualification {
  status: RenderStatus
  conditions: string[]
}

export type GroupQualificationMap = Record<string, TeamQualification>

// ─── sortByFifa: order standings by puntos → GD → GF → fifaRank ──────────────

export function sortByFifa(standings: GroupStanding[]): GroupStanding[] {
  return [...standings].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.gd !== b.gd) return b.gd - a.gd
    if (a.gf !== b.gf) return b.gf - a.gf
    return getFifaRank(a.teamCode) - getFifaRank(b.teamCode)
  })
}

// ─── simulateGroup: apply match outcomes and return sorted standings ────────

function simulateGroup(
  standings: GroupStanding[],
  fixture: RemainingMatch,
  outcome: MatchOutcome,
  otherFixture: RemainingMatch,
  otherOutcome: MatchOutcome,
): GroupStanding[] {
  const copy = [...standings]

  // Apply first fixture
  applyOutcome(copy, fixture, outcome)
  // Apply second fixture
  applyOutcome(copy, otherFixture, otherOutcome)

  return sortByFifa(copy)
}

function applyOutcome(standings: GroupStanding[], fixture: RemainingMatch, outcome: MatchOutcome) {
  const home = standings.find(s => s.teamCode === fixture.home)
  const away = standings.find(s => s.teamCode === fixture.away)
  if (!home || !away) return

  const homeGoals = outcome === 'win' ? 1 : outcome === 'draw' ? 0 : 0
  const awayGoals = outcome === 'loss' ? 1 : outcome === 'draw' ? 0 : 0

  home.played += 1
  away.played += 1
  home.gf += homeGoals
  away.gf += awayGoals
  home.gd += homeGoals - awayGoals
  away.gd += awayGoals - homeGoals

  if (outcome === 'win') {
    home.won += 1
    away.lost += 1
    home.points += 3
  } else if (outcome === 'draw') {
    home.drawn += 1
    away.drawn += 1
    home.points += 1
    away.points += 1
  } else {
    home.lost += 1
    away.won += 1
    away.points += 3
  }
}

// ─── computeTop2: can team reach top-2? ───────────────────────────────────────

export function computeTop2(
  teamCode: string,
  standings: GroupStanding[],
  fixtures: RemainingMatch[],
): 'qualified' | 'contending' | 'eliminated_top2' {
  if (fixtures.length === 0) {
    const pos = sortByFifa(standings).findIndex(s => s.teamCode === teamCode)
    return pos <= 1 ? 'qualified' : 'eliminated_top2'
  }

  const scenarios = generateScenarios(standings.length * 2) // all possible match outcomes
  const qualifyingScenarios = scenarios.filter(scenario => {
    const simulated = simulateAll(standings, fixtures, scenario)
    const pos = sortByFifa(simulated).findIndex(s => s.teamCode === teamCode)
    return pos <= 1
  })

  if (qualifyingScenarios.length === 0) return 'eliminated_top2'
  if (qualifyingScenarios.length === scenarios.length) return 'qualified'
  return 'contending'
}

function generateScenarios(count: number): MatchOutcome[][] {
  const outcomes: MatchOutcome[] = ['win', 'draw', 'loss']
  const result: MatchOutcome[][] = []
  for (let i = 0; i < Math.pow(3, count); i++) {
    const scenario: MatchOutcome[] = []
    let num = i
    for (let j = 0; j < count; j++) {
      scenario.push(outcomes[num % 3])
      num = Math.floor(num / 3)
    }
    result.push(scenario)
  }
  return result
}

function simulateAll(
  standings: GroupStanding[],
  fixtures: RemainingMatch[],
  scenario: MatchOutcome[],
): GroupStanding[] {
  let copy = JSON.parse(JSON.stringify(standings)) as GroupStanding[]
  for (let i = 0; i < fixtures.length; i++) {
    applyOutcome(copy, fixtures[i], scenario[i])
  }
  return copy
}

// ─── rankThirds: get 3rd-place teams ordered by FIFA criteria ────────────────

export function rankThirds(
  allGroupsStandings: GroupStandingsMap,
): Array<{ group: string; team: GroupStanding }> {
  const thirds: Array<{ group: string; team: GroupStanding }> = []

  for (const [groupName, standings] of Object.entries(allGroupsStandings)) {
    if (standings.length < 3) continue
    const sorted = sortByFifa(standings)
    thirds.push({ group: groupName, team: sorted[2] })
  }

  return sortByFifa(thirds.map(t => t.team))
    .map(team => ({
      group: Object.entries(allGroupsStandings).find(
        ([_, s]) => sortByFifa(s)[2]?.teamCode === team.teamCode,
      )?.[0] || '?',
      team,
    }))
}

// ─── bestThirdCodes: top 8 3rd-place teams ─────────────────────────────────────

export function bestThirdCodes(allGroupsStandings: GroupStandingsMap): string[] {
  return rankThirds(allGroupsStandings)
    .slice(0, 8)
    .map(t => t.team.teamCode)
}

// ─── isThirdEliminated: can team be a best 3rd? ────────────────────────────────

export function isThirdEliminated(
  teamCode: string,
  group: GroupStanding[],
  allGroupsStandings: GroupStandingsMap,
): boolean {
  const team = group.find(s => s.teamCode === teamCode)
  if (!team) return true

  // If fewer than 3 games played, cannot be eliminated from better terceros
  if (team.played < 3) return false

  // If played 3 and in position 4, definitely eliminated
  const pos = sortByFifa(group).findIndex(s => s.teamCode === teamCode)
  if (pos === 3) return true

  // Position 3: check if ≥8 locked thirds rank above
  if (pos !== 2) return false // Should not happen at played==3

  let lockedThirdsAbove = 0
  for (const [gName, gStandings] of Object.entries(allGroupsStandings)) {
    if (gName === group[0].teamCode?.slice(0, 1)) continue // Skip own group
    if (gStandings.length < 3) continue
    const thirdStanding = gStandings[2]
    if (thirdStanding.played !== 3) continue // Only count finished groups
    if (
      thirdStanding.points > team.points ||
      (thirdStanding.points === team.points && thirdStanding.gd > team.gd) ||
      (thirdStanding.points === team.points && thirdStanding.gd === team.gd && thirdStanding.gf > team.gf) ||
      (thirdStanding.points === team.points &&
        thirdStanding.gd === team.gd &&
        thirdStanding.gf === team.gf &&
        getFifaRank(thirdStanding.teamCode) < getFifaRank(teamCode))
    ) {
      lockedThirdsAbove++
    }
  }

  return lockedThirdsAbove >= 8
}

// ─── resolveStatus: determine final render status ──────────────────────────────

export function resolveStatus(
  teamCode: string,
  group: GroupStanding[],
  allGroupsStandings: GroupStandingsMap,
  fixtures: RemainingMatch[],
): RenderStatus {
  const team = group.find(s => s.teamCode === teamCode)
  if (!team) return 'none'

  // Check top-2 status
  const top2Status = computeTop2(teamCode, group, fixtures)

  if (top2Status === 'qualified') return 'qualified'
  if (top2Status === 'contending') return 'contending'

  // Eliminated from top-2 — check better tercero
  if (isThirdEliminated(teamCode, group, allGroupsStandings)) return 'eliminated'

  // Can be better tercero
  return 'third'
}

// ─── formatConditions: generate readable conditions ───────────────────────────

export function formatConditions(
  _teamCode: string,
  _standings: GroupStanding[],
  _fixtures: RemainingMatch[],
): string[] {
  throw new Error('not implemented')
}
