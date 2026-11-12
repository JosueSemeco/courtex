import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AuthUser } from '../lib/auth'
import { listMyTeams } from '../lib/data'
import type { Team } from '../lib/data'
import { RosterPage } from '../features/roster/RosterPage'
import { TeamOnboarding } from '../features/teams/TeamOnboarding'

type AppShellProps = {
  user: AuthUser
  onSignOut: () => Promise<void>
}

function storageKey(userId: string) {
  return `courtex.team.${userId}`
}

export function AppShell({ user, onSignOut }: AppShellProps) {
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listMyTeams })
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(storageKey(user.id)))

  const teams = teamsQuery.data ?? []
  const team: Team | null = teams.find((candidate) => candidate.id === selectedId) ?? teams[0] ?? null

  useEffect(() => {
    if (team) localStorage.setItem(storageKey(user.id), team.id)
  }, [team, user.id])

  return (
    <div className="app">
      <header className="app-bar">
        <span className="app-bar__brand">
          Court<span>EX</span>
        </span>

        {teams.length > 1 ? (
          <label className="app-bar__team">
            <span className="sr-only">Equipo</span>
            <select
              className="app-bar__select"
              value={team?.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {teams.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
        ) : team ? (
          <span className="app-bar__team-name">{team.name}</span>
        ) : null}

        <div className="app-bar__user">
          <span className="app-bar__user-name">{user.name}</span>
          <button type="button" className="btn btn-quiet" onClick={onSignOut}>
            Salir
          </button>
        </div>
      </header>

      <main className="app-main">
        {teamsQuery.isLoading ? (
          <div className="empty" aria-live="polite" aria-busy="true">
            <p className="empty__text">Cargando equipos…</p>
          </div>
        ) : teamsQuery.isError ? (
          <div className="empty">
            <h1 className="empty__title">No se pudieron cargar tus equipos</h1>
            <p className="empty__text">
              {teamsQuery.error instanceof Error
                ? teamsQuery.error.message
                : 'Revisa la conexión e inténtalo de nuevo.'}
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => teamsQuery.refetch()}>
              Reintentar
            </button>
          </div>
        ) : !team ? (
          <TeamOnboarding onCreated={(created) => setSelectedId(created.id)} />
        ) : (
          <RosterPage key={team.id} team={team} />
        )}
      </main>
    </div>
  )
}
