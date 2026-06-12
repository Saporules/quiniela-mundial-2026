import { TEAMS, TEAM_INFO, getTeamsByTier } from './teams.js'
import {
  getAssignments, getParticipants, getClaims,
  insertTeamAssignment, clearAssignments, updateQuinielaStatus,
} from './db.js'
import type { Tier } from '../types/index.js'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const arr2 = new Uint32Array(1)
    crypto.getRandomValues(arr2)
    const j = arr2[0]! % (i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export async function assignTeams(quinielaId: number): Promise<{ assigned: number; leftover: string[] }> {
  const participants = await getParticipants(quinielaId)
  const N = participants.length
  if (N === 0) throw new Error('No hay participantes en la quiniela')

  await clearAssignments(quinielaId)

  const tiers: Tier[] = ['favorito', 'creyente', 'maleta']
  const leftover: string[] = []
  let assigned = 0

  for (const tier of tiers) {
    const tierTeams = shuffleArray(getTeamsByTier(tier))
    const perPerson = Math.floor(tierTeams.length / N)
    for (let idx = 0; idx < tierTeams.length; idx++) {
      const team = tierTeams[idx]!
      if (idx < perPerson * N) {
        const participant = participants[idx % N]!
        await insertTeamAssignment({ quinielaId, participantId: participant.id, teamCode: team.code, assignmentType: 'random', sharePercentage: 100, extraPaid: 0 })
        assigned++
      } else {
        leftover.push(team.code)
      }
    }
  }

  await updateQuinielaStatus(quinielaId, 'draft')
  return { assigned, leftover }
}

export async function resolveClaims(quinielaId: number, quiniela: {
  favoritoPrice: number; creyentePrice: number; maletePrice: number
}): Promise<void> {
  const claims = await getClaims(quinielaId)
  const assignments = await getAssignments(quinielaId)
  const assignedCodes = new Set(assignments.map(a => a.team_code))

  const claimsByTeam = new Map<string, number[]>()
  for (const claim of claims) {
    if (!claimsByTeam.has(claim.team_code)) claimsByTeam.set(claim.team_code, [])
    claimsByTeam.get(claim.team_code)!.push(claim.participant_id)
  }

  for (const [teamCode, participantIds] of claimsByTeam.entries()) {
    if (assignedCodes.has(teamCode)) continue
    const team = TEAMS.find(t => t.code === teamCode)
    if (!team) continue
    const tierPrice = team.tier === 'favorito' ? quiniela.favoritoPrice : team.tier === 'creyente' ? quiniela.creyentePrice : quiniela.maletePrice
    const share = 100 / participantIds.length
    const eachPays = Math.ceil(tierPrice / participantIds.length)
    for (const pid of participantIds) {
      await insertTeamAssignment({ quinielaId, participantId: pid, teamCode, assignmentType: 'claimed', sharePercentage: share, extraPaid: eachPays })
    }
  }

  await updateQuinielaStatus(quinielaId, 'active')
}

// Full Aleatorio: teams sorted by FIFA rank, distributed in groups of N
export async function assignTeamsFull(quinielaId: number): Promise<{ assigned: number }> {
  const participants = await getParticipants(quinielaId)
  const N = participants.length
  if (N === 0) throw new Error('No hay participantes en la quiniela')

  await clearAssignments(quinielaId)

  // Sort all teams by FIFA rank ascending (best first), fallback 999 if not in TEAM_INFO
  const sortedTeams = [...TEAMS].sort((a, b) => {
    const ra = TEAM_INFO[a.code]?.fifaRank ?? 999
    const rb = TEAM_INFO[b.code]?.fifaRank ?? 999
    return ra - rb
  })

  // Shuffle participants order once per round
  let assigned = 0

  // Full rounds of N
  const fullRounds = Math.floor(sortedTeams.length / N)
  for (let round = 0; round < fullRounds; round++) {
    const group = sortedTeams.slice(round * N, (round + 1) * N)
    const shuffledParticipants = shuffleArray(participants)
    for (let i = 0; i < group.length; i++) {
      await insertTeamAssignment({
        quinielaId,
        participantId: shuffledParticipants[i]!.id,
        teamCode: group[i]!.code,
        assignmentType: 'full_random',
        sharePercentage: 100,
        extraPaid: 0,
      })
      assigned++
    }
  }

  // Leftover teams: assign randomly to different participants
  const leftoverTeams = shuffleArray(sortedTeams.slice(fullRounds * N))
  const shuffledForLeftover = shuffleArray(participants)
  for (let i = 0; i < leftoverTeams.length; i++) {
    await insertTeamAssignment({
      quinielaId,
      participantId: shuffledForLeftover[i % N]!.id,
      teamCode: leftoverTeams[i]!.code,
      assignmentType: 'full_random',
      sharePercentage: 100,
      extraPaid: 0,
    })
    assigned++
  }

  // Full random skips draft — go directly to active
  await updateQuinielaStatus(quinielaId, 'active')
  return { assigned }
}

export async function getLeftoverTeams(quinielaId: number): Promise<string[]> {
  const assignments = await getAssignments(quinielaId)
  const assignedCodes = new Set(assignments.map(a => a.team_code))
  return TEAMS.filter(t => !assignedCodes.has(t.code)).map(t => t.code)
}

export async function calculateTotalPool(basePrice: number, participantCount: number, quinielaId: number): Promise<number> {
  const base = basePrice * participantCount
  const assignments = await getAssignments(quinielaId)
  const extra = assignments.filter(a => a.assignment_type === 'claimed').reduce((sum, a) => sum + (a.extra_paid ?? 0), 0)
  return base + extra
}
