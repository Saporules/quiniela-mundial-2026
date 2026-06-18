import { describe, it, expect } from 'vitest'
import {
  sortByFifa,
  computeTop2,
  rankThirds,
  bestThirdCodes,
  isThirdEliminated,
  resolveStatus,
  formatConditions,
} from '../qualification.js'
import type { GroupStanding, GroupStandingsMap } from '../espn.js'
import type { RemainingMatch } from '../qualification.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function s(
  teamCode: string,
  played: number,
  points: number,
  gd: number,
  gf: number,
  won = 0,
  drawn = 0,
  lost = 0,
): GroupStanding {
  return { teamCode, played, won, drawn, lost, gd, gf, points }
}

function m(home: string, away: string): RemainingMatch {
  return { home, away }
}

// ─── sortByFifa ───────────────────────────────────────────────────────────────

describe('sortByFifa', () => {
  it('should sort by points descending', () => {
    const standings = [s('MEX', 2, 3, 0, 1), s('ARG', 2, 6, 2, 3), s('BRA', 2, 0, -2, 0)]
    const result = sortByFifa(standings)
    expect(result.map(r => r.teamCode)).toEqual(['ARG', 'MEX', 'BRA'])
  })

  it('should sort by GD when points are equal', () => {
    const standings = [s('MEX', 2, 3, 0, 1), s('ARG', 2, 3, +2, 3), s('BRA', 2, 3, -1, 1)]
    const result = sortByFifa(standings)
    expect(result.map(r => r.teamCode)).toEqual(['ARG', 'MEX', 'BRA'])
  })

  it('should sort by GF when points and GD are equal', () => {
    const standings = [s('MEX', 2, 3, 0, 1), s('ARG', 2, 3, 0, 3), s('BRA', 2, 3, 0, 2)]
    const result = sortByFifa(standings)
    expect(result.map(r => r.teamCode)).toEqual(['ARG', 'BRA', 'MEX'])
  })

  it('should sort by fifaRank ascending when points GD GF are all equal (lower rank = better)', () => {
    // ARG=rank1, FRA=rank3, GER=rank6 — ARG should win tiebreaker
    const standings = [s('GER', 2, 3, 0, 1), s('ARG', 2, 3, 0, 1), s('FRA', 2, 3, 0, 1)]
    const result = sortByFifa(standings)
    expect(result[0].teamCode).toBe('ARG')
    expect(result[1].teamCode).toBe('FRA')
    expect(result[2].teamCode).toBe('GER')
  })

  it('should return empty array unchanged', () => {
    expect(sortByFifa([])).toEqual([])
  })

  it('should not mutate the original array', () => {
    const standings = [s('BRA', 2, 6, 2, 3), s('ARG', 2, 3, 0, 1)]
    const original = [...standings]
    sortByFifa(standings)
    expect(standings[0].teamCode).toBe(original[0].teamCode)
  })
})

// ─── computeTop2 ─────────────────────────────────────────────────────────────

describe('computeTop2', () => {
  /*
   * Grupo de prueba A — after 2 games each:
   *   ARG: 6pts, GD+4, GF=5  (won 2)
   *   BRA: 4pts, GD+1, GF=2  (won 1, drew 1)
   *   ESP: 3pts, GD 0, GF=1  (won 1, lost 1)
   *   MEX: 0pts, GD-5, GF=0  (lost 2)
   * Remaining: ARG vs MEX, BRA vs ESP
   */
  const groupA = [
    s('ARG', 2, 6, +4, 5, 2, 0, 0),
    s('BRA', 2, 4, +1, 2, 1, 1, 0),
    s('ESP', 2, 3,  0, 1, 1, 0, 1),
    s('MEX', 2, 0, -5, 0, 0, 0, 2),
  ]
  const fixturesA = [m('ARG', 'MEX'), m('BRA', 'ESP')]

  it('should return qualified when team finishes top-2 in ALL scenarios', () => {
    // ARG has 6 pts; worst case: loses to MEX (6 pts), BRA wins (7 pts) → ARG still 2nd
    expect(computeTop2('ARG', groupA, fixturesA)).toBe('qualified')
  })

  it('should return eliminated_top2 when team cannot finish top-2 in ANY scenario', () => {
    // MEX has 0 pts; best case: beats ARG (3 pts), BRA loses to ESP (ESP=6, BRA=4)
    // Best order: ESP=6, BRA=4, MEX=3, ARG=6 → actually ARG=6 draws with ESP on pts
    // MEX max possible = 3 pts, but ESP(3)+win=6, BRA(4)+draw=5, ARG(6)+anything≥6
    // MEX can never reach top-2
    expect(computeTop2('MEX', groupA, fixturesA)).toBe('eliminated_top2')
  })

  it('should return contending when team can reach top-2 in some but not all scenarios', () => {
    // ESP has 3 pts: if ESP beats BRA (+3pts=6), and ARG loses to MEX (ARG stays 6) → ESP=6, ARG=6 tie
    // GD: ESP was 0, after win +1 = +1; ARG after loss -1 = +3; ARG still above
    // But there exist scenarios where ESP finishes 2nd
    expect(computeTop2('ESP', groupA, fixturesA)).toBe('contending')
  })

  /*
   * Grupo de prueba B — finished (all 3 games played):
   *   FRA: 9pts (1st)
   *   GER: 6pts (2nd)
   *   POR: 3pts (3rd)
   *   BEL: 0pts (4th)
   * No remaining fixtures.
   */
  const groupB_final = [
    s('FRA', 3, 9, +5, 6, 3, 0, 0),
    s('GER', 3, 6, +1, 3, 2, 0, 1),
    s('POR', 3, 3, -2, 2, 1, 0, 2),
    s('BEL', 3, 0, -4, 1, 0, 0, 3),
  ]
  const fixturesB_empty: RemainingMatch[] = []

  it('should return qualified when played==3 and currently position 0 or 1', () => {
    expect(computeTop2('FRA', groupB_final, fixturesB_empty)).toBe('qualified')
    expect(computeTop2('GER', groupB_final, fixturesB_empty)).toBe('qualified')
  })

  it('should return eliminated_top2 when played==3 and currently position 2 or 3', () => {
    expect(computeTop2('POR', groupB_final, fixturesB_empty)).toBe('eliminated_top2')
    expect(computeTop2('BEL', groupB_final, fixturesB_empty)).toBe('eliminated_top2')
  })

  /*
   * Grupo de prueba C — 1 game played each (tooltip NOT shown but status still computed):
   *   NED: 3pts, URU: 1pt, JPN: 1pt, SWE: 0pts
   * Remaining: NED vs JPN, URU vs SWE, NED vs SWE, URU vs JPN
   */
  const groupC_early = [
    s('NED', 1, 3, +2, 2, 1, 0, 0),
    s('URU', 1, 1,  0, 1, 0, 1, 0),
    s('JPN', 1, 1,  0, 1, 0, 1, 0),
    s('SWE', 1, 0, -2, 0, 0, 0, 1),
  ]
  const fixturesC = [m('NED', 'JPN'), m('URU', 'SWE'), m('NED', 'SWE'), m('URU', 'JPN')]

  it('should handle multiple remaining fixtures (>2 matches) without crashing', () => {
    const result = computeTop2('NED', groupC_early, fixturesC)
    expect(['qualified', 'contending', 'eliminated_top2']).toContain(result)
  })
})

// ─── rankThirds ───────────────────────────────────────────────────────────────

describe('rankThirds', () => {
  /*
   * 3 completed groups (played==3), each with a clear 3rd place.
   * Group X: 3rd = KOR (4 pts, GD 0, GF 2)
   * Group Y: 3rd = MAR (4 pts, GD 0, GF 2) — same as KOR; MAR rank=10, KOR rank=20 → MAR beats KOR
   * Group Z: 3rd = ECU (3 pts)
   */
  const allGroups: GroupStandingsMap = {
    X: [
      s('ARG', 3, 9, +5, 6, 3, 0, 0),
      s('BRA', 3, 6, +2, 4, 2, 0, 1),
      s('KOR', 3, 4,  0, 2, 1, 1, 1), // 3rd
      s('CZE', 3, 0, -7, 0, 0, 0, 3),
    ],
    Y: [
      s('FRA', 3, 9, +4, 5),
      s('GER', 3, 6, +2, 3),
      s('MAR', 3, 4,  0, 2), // 3rd — same pts/gd/gf as KOR; MAR rank=10 < KOR rank=20 → MAR 1st
      s('HAI', 3, 0, -6, 0),
    ],
    Z: [
      s('ESP', 3, 9, +6, 7),
      s('ENG', 3, 6, +2, 4),
      s('ECU', 3, 3, -2, 2), // 3rd
      s('CUR', 3, 0, -6, 0),
    ],
  }

  it('should return exactly one third-place team per group', () => {
    const thirds = rankThirds(allGroups)
    expect(thirds).toHaveLength(3)
    expect(thirds.map(t => t.group).sort()).toEqual(['X', 'Y', 'Z'])
  })

  it('should correctly identify the 3rd-place finisher in each group', () => {
    const thirds = rankThirds(allGroups)
    const byGroup = Object.fromEntries(thirds.map(t => [t.group, t.team.teamCode]))
    expect(byGroup['X']).toBe('KOR')
    expect(byGroup['Y']).toBe('MAR')
    expect(byGroup['Z']).toBe('ECU')
  })

  it('should rank thirds by points descending', () => {
    const thirds = rankThirds(allGroups)
    // KOR and MAR both have 4 pts; ECU has 3 pts → ECU is last
    expect(thirds[2].team.teamCode).toBe('ECU')
  })

  it('should use fifaRank as tiebreaker when points GD GF are equal', () => {
    // KOR(pts=4,gd=0,gf=2,rank=20) vs MAR(pts=4,gd=0,gf=2,rank=10)
    // MAR rank 10 < KOR rank 20 → MAR is ranked higher
    const thirds = rankThirds(allGroups)
    const kodex = thirds.findIndex(t => t.team.teamCode === 'MAR')
    const korIdx = thirds.findIndex(t => t.team.teamCode === 'KOR')
    expect(kodex).toBeLessThan(korIdx)
  })

  it('should skip groups with fewer than 3 teams', () => {
    const sparse: GroupStandingsMap = {
      A: [s('ARG', 3, 9, 5, 6), s('BRA', 3, 6, 2, 4)], // only 2 teams
      B: [s('FRA', 3, 9, 4, 5), s('GER', 3, 6, 2, 3), s('POR', 3, 3, -2, 2), s('BEL', 3, 0, -4, 1)],
    }
    const thirds = rankThirds(sparse)
    expect(thirds).toHaveLength(1)
    expect(thirds[0].group).toBe('B')
  })
})

// ─── bestThirdCodes ───────────────────────────────────────────────────────────

describe('bestThirdCodes', () => {
  it('should return at most 8 team codes', () => {
    // Build 12 groups each with a clear 3rd
    const groups: GroupStandingsMap = {}
    const teams = ['ARG','BRA','ESP','FRA','GER','POR','NED','ENG','MEX','URU','CRO','COL']
    teams.forEach((code, i) => {
      groups[String.fromCharCode(65 + i)] = [
        s('T1_' + i, 3, 9, 5, 6),
        s('T2_' + i, 3, 6, 2, 4),
        s(code,      3, (10 - i), 0, 2), // 3rd — different points so ranking is clear
        s('T4_' + i, 3, 0, -7, 0),
      ]
    })
    const codes = bestThirdCodes(groups)
    expect(codes).toHaveLength(8)
  })

  it('should return the best thirds in order', () => {
    const groups: GroupStandingsMap = {
      A: [s('AA',3,9,5,6), s('AB',3,6,2,4), s('ARG',3,7,3,4), s('AD',3,0,-7,0)], // ARG 3rd with 7pts
      B: [s('BA',3,9,5,6), s('BB',3,6,2,4), s('BRA',3,4,0,2), s('BD',3,0,-7,0)], // BRA 3rd with 4pts
    }
    const codes = bestThirdCodes(groups)
    expect(codes[0]).toBe('ARG') // 7pts > 4pts
  })
})

// ─── isThirdEliminated ────────────────────────────────────────────────────────

describe('isThirdEliminated', () => {
  /*
   * Helper: build a GroupStandingsMap where N groups are fully finished
   * and each has a 3rd-place team with `pts` points, `gd` GD, `gf` GF.
   * The evaluated team has max possible of `maxPts` pts.
   */
  function buildAllGroups(
    lockedThirds: Array<{ code: string; pts: number; gd: number; gf: number }>,
    evaluatedTeam: GroupStanding,
    evaluatedGroup: GroupStanding[],
  ): GroupStandingsMap {
    const map: GroupStandingsMap = { EVAL: evaluatedGroup }
    lockedThirds.forEach(({ code, pts, gd, gf }, i) => {
      const key = 'G' + i
      map[key] = [
        s('W_' + i, 3, 9,  5, 6),
        s('R_' + i, 3, 6,  2, 4),
        s(code,     3, pts, gd, gf), // locked 3rd
        s('L_' + i, 3, 0, -7, 0),
      ]
    })
    return map
  }

  it('should return false when evaluated team has played fewer than 3 games', () => {
    const group = [s('MEX',2,0,-5,0), s('ARG',2,6,4,5), s('BRA',2,4,1,2), s('ESP',2,3,0,1)]
    const allGroups = buildAllGroups(
      Array.from({ length: 8 }, (_, i) => ({ code: 'LT'+i, pts: 7, gd: 2, gf: 3 })),
      group[0],
      group,
    )
    // MEX has played 2 games — must return false regardless of other groups
    expect(isThirdEliminated('MEX', group, allGroups)).toBe(false)
  })

  it('should return true when team finished 4th in a completed group', () => {
    const group = [
      s('FRA', 3, 9, +5, 6, 3, 0, 0),
      s('GER', 3, 6, +1, 3, 2, 0, 1),
      s('POR', 3, 3, -2, 2, 1, 0, 2),
      s('BEL', 3, 0, -4, 1, 0, 0, 3),
    ]
    const allGroups: GroupStandingsMap = { EVAL: group }
    // BEL is 4th in a completed group → eliminated from being best 3rd
    expect(isThirdEliminated('BEL', group, allGroups)).toBe(true)
  })

  it('should return true when 8+ locked thirds have better stats than evaluated team', () => {
    // Evaluated team: finished 3rd with 3pts, GD=0, GF=1
    const evaluatedTeam = s('CZE', 3, 3, 0, 1)
    const evalGroup = [
      s('ARG', 3, 9, 5, 6),
      s('BRA', 3, 6, 2, 4),
      evaluatedTeam,
      s('HAI', 3, 0, -7, 0),
    ]
    // 8 other groups, each with a locked 3rd that has 5pts > CZE's 3pts
    const eightBetterLocked = Array.from({ length: 8 }, (_, i) => ({
      code: 'LT' + i, pts: 5, gd: 1, gf: 2,
    }))
    const allGroups = buildAllGroups(eightBetterLocked, evaluatedTeam, evalGroup)
    expect(isThirdEliminated('CZE', evalGroup, allGroups)).toBe(true)
  })

  it('should return false when only 7 locked thirds rank above evaluated team', () => {
    const evaluatedTeam = s('CZE', 3, 3, 0, 1)
    const evalGroup = [
      s('ARG', 3, 9, 5, 6),
      s('BRA', 3, 6, 2, 4),
      evaluatedTeam,
      s('HAI', 3, 0, -7, 0),
    ]
    // Only 7 locked thirds above → not yet eliminated
    const sevenBetterLocked = Array.from({ length: 7 }, (_, i) => ({
      code: 'LT' + i, pts: 5, gd: 1, gf: 2,
    }))
    const allGroups = buildAllGroups(sevenBetterLocked, evaluatedTeam, evalGroup)
    expect(isThirdEliminated('CZE', evalGroup, allGroups)).toBe(false)
  })

  it('should NOT count groups that are not fully finished as locked thirds', () => {
    const evaluatedTeam = s('CZE', 3, 3, 0, 1)
    const evalGroup = [
      s('ARG', 3, 9, 5, 6),
      s('BRA', 3, 6, 2, 4),
      evaluatedTeam,
      s('HAI', 3, 0, -7, 0),
    ]
    // 7 locked thirds + 1 incomplete group (played=2) with a "better" 3rd
    const sevenLocked = Array.from({ length: 7 }, (_, i) => ({
      code: 'LT' + i, pts: 5, gd: 1, gf: 2,
    }))
    const allGroups = buildAllGroups(sevenLocked, evaluatedTeam, evalGroup)
    // Add one incomplete group whose 3rd has played only 2 games
    allGroups['INCOMPLETE'] = [
      s('W_X', 2, 6,  4, 5),
      s('R_X', 2, 4,  1, 2),
      s('INCO', 2, 5, 2, 3), // played=2 → not locked → should NOT count
      s('L_X', 2, 0, -7, 0),
    ]
    // Still only 7 locked thirds → should be false
    expect(isThirdEliminated('CZE', evalGroup, allGroups)).toBe(false)
  })
})

// ─── resolveStatus ────────────────────────────────────────────────────────────

describe('resolveStatus', () => {
  const completedGroupTop2: GroupStanding[] = [
    s('FRA', 3, 9, +5, 6, 3, 0, 0),
    s('GER', 3, 6, +1, 3, 2, 0, 1),
    s('POR', 3, 3, -2, 2, 1, 0, 2),
    s('BEL', 3, 0, -4, 1, 0, 0, 3),
  ]

  it('should return qualified for a team guaranteed top-2 in all scenarios', () => {
    const allGroups: GroupStandingsMap = { A: completedGroupTop2 }
    const result = resolveStatus('FRA', completedGroupTop2, allGroups, [])
    expect(result).toBe('qualified')
  })

  it('should return eliminated for a 4th-place team in a completed group', () => {
    const allGroups: GroupStandingsMap = { A: completedGroupTop2 }
    // BEL is 4th in completed group → eliminated_top2 + eliminated_third → eliminated
    const result = resolveStatus('BEL', completedGroupTop2, allGroups, [])
    expect(result).toBe('eliminated')
  })

  it('should return contending over third when team can still reach top-2', () => {
    // Team with a shot at top-2 should NOT show bronze emoji, even if currently 3rd
    const group = [
      s('ARG', 2, 6, +4, 5, 2, 0, 0),
      s('BRA', 2, 4, +1, 2, 1, 1, 0),
      s('ESP', 2, 3,  0, 1, 1, 0, 1),
      s('MEX', 2, 0, -5, 0, 0, 0, 2),
    ]
    const allGroups: GroupStandingsMap = { A: group }
    const fixtures = [m('ARG', 'MEX'), m('BRA', 'ESP')]
    // ESP is currently 3rd but can reach top-2 → must be contending, not third
    const result = resolveStatus('ESP', group, allGroups, fixtures)
    expect(result).toBe('contending')
  })

  it('should return third when team is eliminated from top-2 but in best-8 thirds snapshot', () => {
    // POR finished 3rd in completed group; assume POR is in best-8 thirds
    const allGroups: GroupStandingsMap = { A: completedGroupTop2 }
    const result = resolveStatus('POR', completedGroupTop2, allGroups, [])
    // POR is 3rd with 3pts — whether it's 'third' or 'eliminated' depends on other groups
    // In this minimal map (only 1 group), POR is definitely in the best thirds → 'third'
    expect(result).toBe('third')
  })

  it('should respect priority: qualified > contending > third > eliminated', () => {
    // Smoke test: verify no status lower in priority overrides a higher one
    const allGroups: GroupStandingsMap = { A: completedGroupTop2 }
    const q = resolveStatus('FRA', completedGroupTop2, allGroups, [])
    const e = resolveStatus('BEL', completedGroupTop2, allGroups, [])
    const statusPriority = ['qualified', 'contending', 'third', 'eliminated', 'none']
    expect(statusPriority.indexOf(q)).toBeLessThan(statusPriority.indexOf(e))
  })
})

// ─── formatConditions ─────────────────────────────────────────────────────────

describe('formatConditions', () => {
  /*
   * Group setup: ARG playing MEX, BRA playing ESP. ARG needs to win to guarantee top-2.
   * ARG: 3pts, GD=0, GF=1 (contending)
   * BRA: 6pts (already safe)
   * ESP: 3pts same as ARG but GD advantage
   * MEX: 3pts
   */
  const contendingGroup = [
    s('BRA', 2, 6, +3, 4, 2, 0, 0),
    s('ESP', 2, 3, +2, 3, 1, 0, 1),
    s('ARG', 2, 3,  0, 1, 1, 0, 1),
    s('MEX', 2, 3, -5, 0, 1, 0, 1),
  ]
  const fixtures = [m('ARG', 'MEX'), m('BRA', 'ESP')]

  it('should return an array of strings when team has 1 game remaining and is contending', () => {
    const conditions = formatConditions('ARG', contendingGroup, fixtures)
    expect(Array.isArray(conditions)).toBe(true)
    expect(conditions.length).toBeGreaterThan(0)
  })

  it('should return empty array for teams with 3 games played (no remaining)', () => {
    const finishedGroup = [
      s('FRA', 3, 9, 5, 6),
      s('GER', 3, 6, 2, 4),
      s('POR', 3, 3, -2, 2),
      s('BEL', 3, 0, -4, 0),
    ]
    const conditions = formatConditions('POR', finishedGroup, [])
    expect(conditions).toEqual([])
  })

  it('should produce strings containing the opponent name from getTeam()', () => {
    // ARG plays MEX → conditions should reference "México" or "MEX" as fallback
    const conditions = formatConditions('ARG', contendingGroup, fixtures)
    const combined = conditions.join(' ')
    // At minimum, the opponent code or name should appear
    expect(combined.toLowerCase()).toMatch(/m[eé]xico|mex/i)
  })

  it('should include GD condition text when winning is not enough on its own', () => {
    /*
     * Scenario: ARG and ESP have same points (3). If both win in the last round,
     * they end tied on points. GD must resolve it.
     * ARG: GD=0, ESP: GD=+2 → if both win by min margin, ESP wins GD tiebreak.
     * ARG needs to win with a bigger margin → expect "+N" in some condition.
     */
    const gdGroup = [
      s('BRA', 2, 6, +3, 4),
      s('ESP', 2, 3, +2, 3), // 2nd with GD advantage over ARG
      s('ARG', 2, 3,  0, 1), // tied with ESP on points, but worse GD
      s('CUR', 2, 0, -5, 0),
    ]
    const gdFixtures = [m('ARG', 'CUR'), m('BRA', 'ESP')]
    const conditions = formatConditions('ARG', gdGroup, gdFixtures)
    const combined = conditions.join(' ')
    // Should mention GD requirement somewhere
    expect(combined).toMatch(/\+\d|diferencia|gol/i)
  })

  it('should produce combined conditions with "+" separator when both match results matter', () => {
    /*
     * If ARG can only qualify by winning AND the other result going a certain way,
     * the condition string should contain a compound with " + ".
     */
    const conditions = formatConditions('ARG', contendingGroup, fixtures)
    const hasCompound = conditions.some(c => c.includes('+'))
    // At least one compound condition should exist given the setup
    expect(hasCompound).toBe(true)
  })

  it('should use team code as fallback when getTeam returns undefined', () => {
    // Use codes not in the teams database
    const unknownGroup = [
      s('T1', 2, 6, 3, 4),
      s('T2', 2, 3, 2, 3),
      s('T3', 2, 3, 0, 1),
      s('T4', 2, 0, -5, 0),
    ]
    const unknownFixtures = [m('T3', 'T4'), m('T1', 'T2')]
    // Should not throw even with unknown codes
    expect(() => formatConditions('T3', unknownGroup, unknownFixtures)).not.toThrow()
    const conditions = formatConditions('T3', unknownGroup, unknownFixtures)
    expect(Array.isArray(conditions)).toBe(true)
  })
})

// ─── getFifaRank (via teams.ts) ───────────────────────────────────────────────

describe('getFifaRank', () => {
  // This function is exported from teams.ts — tested here because qualification.ts depends on it
  it('should return correct rank for known WC2026 teams', async () => {
    const { getFifaRank } = await import('../teams.js')
    expect(getFifaRank('ARG')).toBe(1)
    expect(getFifaRank('ESP')).toBe(2)
    expect(getFifaRank('FRA')).toBe(3)
    expect(getFifaRank('MEX')).toBe(14)
  })

  it('should return a high fallback value for unknown team codes', async () => {
    const { getFifaRank } = await import('../teams.js')
    const rank = getFifaRank('XYZ')
    expect(rank).toBeGreaterThan(200) // sentinel "unknown" value
  })

  it('should have fifaRank populated for all 48 WC2026 teams', async () => {
    const { TEAMS, getFifaRank } = await import('../teams.js')
    const missing = TEAMS.filter(t => getFifaRank(t.code) > 200)
    expect(missing).toHaveLength(0)
  })
})
