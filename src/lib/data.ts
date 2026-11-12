import { supabase } from './supabase'

export type MemberRole = 'coach' | 'assistant' | 'player'
export type PlayerStatus = 'active' | 'inactive' | 'archived'
export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
export type Hand = 'right' | 'left' | 'both'
export type Eye = 'right' | 'left' | 'unknown'

export type Team = {
  id: string
  name: string
  category: string | null
  season: string | null
  role: MemberRole
  member_status: string
}

export type Player = {
  id: string
  team_id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position: PlayerPosition | null
  dominant_hand: Hand | null
  dominant_eye: Eye | null
  height_cm: number | null
  weight_kg: number | string | null
  birth_date: string | null
  email: string | null
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_email: string | null
  notes: string | null
  status: PlayerStatus
}

export type PlayerDraft = {
  first_name: string
  last_name: string
  jersey_number: number | null
  position: PlayerPosition | null
  dominant_hand: Hand | null
  dominant_eye: Eye | null
  height_cm: number | null
  weight_kg: number | null
  birth_date: string | null
  email: string | null
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_email: string | null
  notes: string | null
}

export class DataError extends Error {}

type PostgrestLike = { message: string; code?: string; details?: string | null }

export function translateDbError(error: PostgrestLike): string {
  const text = `${error.message} ${error.details ?? ''}`

  if (error.code === '23505' && text.includes('players_team_number_idx')) {
    return 'Ese dorsal ya está en uso por otro jugador activo del equipo.'
  }

  if (error.code === '23505') {
    return 'Ese registro ya existe.'
  }

  if (error.code === '23503') {
    return 'El jugador tiene historial de asistencia o evaluaciones. Archívalo en lugar de borrarlo.'
  }

  if (error.code === '42501' || text.includes('row-level security')) {
    return 'No tienes permiso para esta acción en este equipo.'
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.'
}

function client() {
  if (!supabase) {
    throw new DataError('Supabase no está configurado.')
  }
  return supabase
}

export async function listMyTeams(): Promise<Team[]> {
  const { data, error } = await client().rpc('my_teams')

  if (error) throw new DataError(translateDbError(error))
  return (data ?? []) as Team[]
}

export async function createTeam(input: {
  name: string
  category?: string | null
  season?: string | null
}): Promise<Team> {
  const { data, error } = await client().rpc('create_team', {
    team_name: input.name,
    team_category: input.category ?? null,
    team_season: input.season ?? null,
  })

  if (error) throw new DataError(translateDbError(error))

  const created = data as { id: string; name: string; category: string | null; season: string | null }
  return { ...created, role: 'coach', member_status: 'active' }
}

export async function listPlayers(teamId: string): Promise<Player[]> {
  const { data, error } = await client()
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (error) throw new DataError(translateDbError(error))
  return (data ?? []) as Player[]
}

export async function createPlayer(teamId: string, draft: PlayerDraft): Promise<Player> {
  const { data, error } = await client()
    .from('players')
    .insert({ ...draft, team_id: teamId })
    .select('*')
    .single()

  if (error) throw new DataError(translateDbError(error))
  return data as Player
}

export async function updatePlayer(playerId: string, draft: PlayerDraft): Promise<Player> {
  const { data, error } = await client()
    .from('players')
    .update(draft)
    .eq('id', playerId)
    .select('*')
    .single()

  if (error) throw new DataError(translateDbError(error))
  return data as Player
}

export async function setPlayerStatus(playerId: string, status: PlayerStatus): Promise<Player> {
  const { data, error } = await client()
    .from('players')
    .update({ status })
    .eq('id', playerId)
    .select('*')
    .single()

  if (error) throw new DataError(translateDbError(error))
  return data as Player
}

export async function deletePlayer(playerId: string): Promise<void> {
  const { error } = await client().from('players').delete().eq('id', playerId)
  if (error) throw new DataError(translateDbError(error))
}

export function playerName(player: Pick<Player, 'first_name' | 'last_name'>): string {
  return `${player.first_name} ${player.last_name}`.trim()
}

export function ageYears(birthDate: string | null): number | null {
  if (!birthDate) return null

  const birth = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age
}
