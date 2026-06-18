import type { GroupStanding, GroupStandingsMap } from './espn.js'
import { getFifaRank, getTeam } from './teams.js'

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

function applyOutcomeWithScore(
  standings: GroupStanding[],
  fixture: RemainingMatch,
  homeGoals: number,
  awayGoals: number,
) {
  const home = standings.find(s => s.teamCode === fixture.home)
  const away = standings.find(s => s.teamCode === fixture.away)
  if (!home || !away) return

  home.played += 1
  away.played += 1
  home.gf += homeGoals
  away.gf += awayGoals
  home.gd += homeGoals - awayGoals
  away.gd += awayGoals - homeGoals

  if (homeGoals > awayGoals) {
    home.won += 1
    away.lost += 1
    home.points += 3
  } else if (homeGoals === awayGoals) {
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

const BOUNDARY_GD = 9

export function computeTop2(
  teamCode: string,
  standings: GroupStanding[],
  fixtures: RemainingMatch[],
): 'qualified' | 'contending' | 'eliminated_top2' {
  if (fixtures.length === 0) {
    const pos = sortByFifa(standings).findIndex(s => s.teamCode === teamCode)
    return pos <= 1 ? 'qualified' : 'eliminated_top2'
  }

  const scenarios = generateScenarios(fixtures.length) // all possible match outcomes
  const qualifyingScenarios = scenarios.filter(scenario => {
    const simulated = simulateAll(standings, fixtures, scenario)
    const pos = sortByFifa(simulated).findIndex(s => s.teamCode === teamCode)
    return pos <= 1
  })

  if (qualifyingScenarios.length === scenarios.length) {
    // All standard scenarios qualify — check pessimistic boundary
    const pessimistic = simulateExtreme(teamCode, standings, fixtures, -BOUNDARY_GD, BOUNDARY_GD)
    const posP = sortByFifa(pessimistic).findIndex(s => s.teamCode === teamCode)
    if (posP > 1) return 'contending' // Downgrade if pessimistic fails
    return 'qualified'
  }

  if (qualifyingScenarios.length === 0) {
    // No standard scenarios qualify — check optimistic boundary
    const optimistic = simulateExtreme(teamCode, standings, fixtures, BOUNDARY_GD, -BOUNDARY_GD)
    const posO = sortByFifa(optimistic).findIndex(s => s.teamCode === teamCode)
    if (posO <= 1) return 'contending' // Downgrade if optimistic succeeds
    return 'eliminated_top2'
  }

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

function simulateExtreme(
  teamCode: string,
  standings: GroupStanding[],
  fixtures: RemainingMatch[],
  teamGD: number,
  otherGD: number,
): GroupStanding[] {
  let copy = JSON.parse(JSON.stringify(standings)) as GroupStanding[]

  for (const fixture of fixtures) {
    if (fixture.home === teamCode) {
      // Team is home: apply teamGD as GD change (home goals - away goals = teamGD)
      const homeGoals = teamGD > 0 ? teamGD : 0
      const awayGoals = teamGD > 0 ? 0 : -teamGD
      applyOutcomeWithScore(copy, fixture, homeGoals, awayGoals)
    } else if (fixture.away === teamCode) {
      // Team is away: apply teamGD as GD change (away goals - home goals = teamGD)
      const homeGoals = teamGD > 0 ? 0 : -teamGD
      const awayGoals = teamGD > 0 ? teamGD : 0
      applyOutcomeWithScore(copy, fixture, homeGoals, awayGoals)
    } else {
      // Other fixture: apply otherGD
      const homeGoals = otherGD > 0 ? otherGD : 0
      const awayGoals = otherGD > 0 ? 0 : -otherGD
      applyOutcomeWithScore(copy, fixture, homeGoals, awayGoals)
    }
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

  thirds.sort((a, b) => {
    if (a.team.points !== b.team.points) return b.team.points - a.team.points
    if (a.team.gd !== b.team.gd) return b.team.gd - a.team.gd
    if (a.team.gf !== b.team.gf) return b.team.gf - a.team.gf
    return getFifaRank(a.team.teamCode) - getFifaRank(b.team.teamCode)
  })

  return thirds
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
  groupKey: string,
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
    if (gName === groupKey) continue // Skip own group
    if (gStandings.length < 3) continue
    const thirdStanding = sortByFifa(gStandings)[2]
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
  groupKey: string,
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
  if (isThirdEliminated(teamCode, groupKey, group, allGroupsStandings)) return 'eliminated'

  // Can be better tercero
  return 'third'
}

// ─── formatConditions: generate readable conditions ───────────────────────────

export function formatConditions(
  teamCode: string,
  standings: GroupStanding[],
  fixtures: RemainingMatch[],
): string[] {
  if (fixtures.length === 0 || fixtures.length > 2) return []

  const myFixtureIdx = fixtures.findIndex(f => f.home === teamCode || f.away === teamCode)
  if (myFixtureIdx === -1) return []

  const myFixture = fixtures[myFixtureIdx]
  const opponent = myFixture.home === teamCode ? myFixture.away : myFixture.home
  const opponentName = getTeam(opponent)?.name ?? opponent

  const otherFixtureIdx = fixtures.findIndex((_, i) => i !== myFixtureIdx)
  const otherFixture = otherFixtureIdx !== -1 ? fixtures[otherFixtureIdx] : null

  const originalTeam = standings.find(s => s.teamCode === teamCode)
  if (!originalTeam) return []

  const conditions: string[] = []
  const myOutcomes: MatchOutcome[] = ['win', 'draw', 'loss']
  const otherOutcomes: MatchOutcome[] = ['win', 'draw', 'loss']

  for (const myOutcome of myOutcomes) {
    const myPhrase =
      myOutcome === 'win' ? `Gana a ${opponentName}`
      : myOutcome === 'draw' ? `Empata con ${opponentName}`
      : `Pierde contra ${opponentName}`

    if (!otherFixture) {
      const sim = simulateAll(standings, [myFixture], [myOutcome])
      const pos = sortByFifa(sim).findIndex(s => s.teamCode === teamCode)
      if (pos <= 1) conditions.push(myPhrase)
      continue
    }

    // Collect which other-match outcomes allow qualification (with min margins)
    const qualifyingOther: MatchOutcome[] = []
    // Collect GD conditions for cases where min win isn't enough
    const gdConditions: Array<{ otherOutcome: MatchOutcome; gdNeeded: number }> = []

    for (const otherOutcome of otherOutcomes) {
      const sim = simulateAll(standings, [myFixture, otherFixture], [myOutcome, otherOutcome])
      const sortedSim = sortByFifa(sim)
      const pos = sortedSim.findIndex(s => s.teamCode === teamCode)

      if (pos <= 1) {
        qualifyingOther.push(otherOutcome)
      } else if (myOutcome === 'win' && pos === 2) {
        // Points tie with 2nd place — check if a larger winning margin would help
        const teamAfterSim = sim.find(s => s.teamCode === teamCode)!
        const secondPlace = sortedSim[1]
        if (secondPlace.points === teamAfterSim.points) {
          // GD decides: compute how many extra goals needed over minimum win
          const gdNeeded = secondPlace.gd - originalTeam.gd + 1
          if (gdNeeded > 1 && gdNeeded <= 15) {
            gdConditions.push({ otherOutcome, gdNeeded })
          }
        }
      }
    }

    if (qualifyingOther.length === 3) {
      // Qualifies regardless of other match
      conditions.push(myPhrase)
    } else if (qualifyingOther.length > 0) {
      // Only some other-match outcomes qualify
      for (const otherOutcome of qualifyingOther) {
        conditions.push(`${myPhrase} + ${otherMatchPhrase(otherFixture, otherOutcome)}`)
      }
    }

    // Add GD conditions for cases where a larger margin would unlock qualification
    for (const { otherOutcome, gdNeeded } of gdConditions) {
      conditions.push(
        `${myPhrase} con +${gdNeeded} de diferencia de gol + ${otherMatchPhrase(otherFixture, otherOutcome)}`,
      )
    }
  }

  return [...new Set(conditions)]
}

function otherMatchPhrase(fixture: RemainingMatch, outcome: MatchOutcome): string {
  const homeName = getTeam(fixture.home)?.name ?? fixture.home
  const awayName = getTeam(fixture.away)?.name ?? fixture.away
  if (outcome === 'win') return `${homeName} le gana a ${awayName}`
  if (outcome === 'draw') return `${homeName} empata con ${awayName}`
  return `${homeName} pierde con ${awayName}`
}
