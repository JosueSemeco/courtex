import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AuthUser } from '../lib/auth'
import { listMyTeams } from '../lib/data'
import type { Team } from '../lib/data'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { RosterPage } from '../features/roster/RosterPage'
import { RoutinesPage } from '../features/routines/RoutinesPage'
import { TeamOnboarding } from '../features/teams/TeamOnboarding'
import { TeamTabs } from '../features/teams/TeamTabs'

type AppShellProps = {
  user: AuthUser
  onSignOut: () => Promise<void>
}

type Section = 'roster' | 'calendar' | 'routines'

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'roster', label: 'Plantilla' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'routines', label: 'Rutinas' },
]

function storageKey(userId: string) {
  return `courtex.team.${userId}`
}

export function AppShell({ user, onSignOut }: AppShellProps) {
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listMyTeams })
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(storageKey(user.id)))
  const [section, setSection] = useState<Section>('roster')

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

        {teams.length > 0 ? (
          <TeamTabs
            teams={teams}
            activeId={team?.id ?? ''}
            onSelect={(id) => {
              setSelectedId(id)
              window.scrollTo({ top: 0 })
            }}
          />
        ) : (
          <span className="app-bar__spacer" />
        )}

        <div className="app-bar__user">
          <span className="app-bar__user-name">{user.name}</span>
          <button type="button" className="btn btn-quiet" onClick={onSignOut}>
            Salir
          </button>
        </div>
      </header>

      {team ? (
        <nav className="section-nav" aria-label="Secciones del equipo">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="section-link"
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="app-main">
        <div
          id="team-panel"
          role={team ? 'tabpanel' : undefined}
          aria-labelledby={team ? `team-tab-${team.id}` : undefined}
        >
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
        ) : section === 'calendar' ? (
          <CalendarPage key={team.id} team={team} />
        ) : section === 'routines' ? (
          <RoutinesPage key={team.id} team={team} />
        ) : (
          <RosterPage key={team.id} team={team} />
        )}
        </div>
      </main>
    </div>
  )
}
