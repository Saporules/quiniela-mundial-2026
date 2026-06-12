export type Tier = 'favorito' | 'creyente' | 'maleta'
export type TournamentStatus = 'setup' | 'draft' | 'active' | 'finished'
export type AssignmentType = 'random' | 'claimed' | 'full_random'
export type QuinielaMode = 'reclamo' | 'full_random'

export interface Team {
  code: string
  name: string
  flag: string
  confederation: string
  tier: Tier
}

export interface AdminUser {
  id: number
  username: string
  createdAt: string
}

export interface Session {
  id: number
  token: string
  adminId: number
  expiresAt: string
}

export interface Quiniela {
  id: number
  slug: string
  name: string
  tournament: string
  basePrice: number
  favoritoPrice: number
  creyentePrice: number
  maletePrice: number
  status: TournamentStatus
  createdAt: string
}

export interface Participant {
  id: number
  quinielaId: number
  name: string
  email: string
  accessToken: string
  createdAt: string
}

export interface TeamAssignment {
  id: number
  quinielaId: number
  participantId: number
  teamCode: string
  assignmentType: AssignmentType
  sharePercentage: number
  extraPaid: number
}

export interface TeamClaim {
  id: number
  quinielaId: number
  participantId: number
  teamCode: string
  createdAt: string
}

export interface MatchCache {
  id: number
  tournament: string
  dataJson: string
  updatedAt: string
}

export interface ESPNMatch {
  id: string
  name: string
  shortName: string
  date: string
  status: {
    type: { name: string; completed: boolean }
    displayClock: string
    period: number
  }
  competitions: Array<{
    competitors: Array<{
      id: string
      team: { id: string; name: string; abbreviation: string; logo: string }
      score: string
      homeAway: string
      winner: boolean
    }>
    venue?: { fullName: string; address?: { city: string } }
    groups?: { name: string }
  }>
}

export interface ESPNStanding {
  team: { id: string; name: string; abbreviation: string }
  stats: Array<{ name: string; value: number; displayValue: string }>
}

export interface QuinielaSummary extends Quiniela {
  participantCount: number
  totalPool: number
}

export interface ParticipantWithTeams extends Participant {
  assignments: Array<TeamAssignment & { team: Team }>
}
