import type { GroupStanding, GroupStandingsMap } from './espn.js'

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

// ─── Stubs (implementation pending — all throw) ───────────────────────────────

export function sortByFifa(_standings: GroupStanding[]): GroupStanding[] {
  throw new Error('not implemented')
}

export function simulateGroup(
  _standings: GroupStanding[],
  _fixture: RemainingMatch,
  _outcome: MatchOutcome,
  _otherFixture: RemainingMatch,
  _otherOutcome: MatchOutcome,
): GroupStanding[] {
  throw new Error('not implemented')
}

export function computeTop2(
  _teamCode: string,
  _standings: GroupStanding[],
  _fixtures: RemainingMatch[],
): 'qualified' | 'contending' | 'eliminated_top2' {
  throw new Error('not implemented')
}

export function rankThirds(
  _allGroupsStandings: GroupStandingsMap,
): Array<{ group: string; team: GroupStanding }> {
  throw new Error('not implemented')
}

export function bestThirdCodes(_allGroupsStandings: GroupStandingsMap): string[] {
  throw new Error('not implemented')
}

export function isThirdEliminated(
  _teamCode: string,
  _group: GroupStanding[],
  _allGroupsStandings: GroupStandingsMap,
): boolean {
  throw new Error('not implemented')
}

export function resolveStatus(
  _teamCode: string,
  _group: GroupStanding[],
  _allGroupsStandings: GroupStandingsMap,
  _fixtures: RemainingMatch[],
): RenderStatus {
  throw new Error('not implemented')
}

export function formatConditions(
  _teamCode: string,
  _standings: GroupStanding[],
  _fixtures: RemainingMatch[],
): string[] {
  throw new Error('not implemented')
}
