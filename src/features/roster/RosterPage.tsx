import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Player, PlayerStatus, Team } from '../../lib/data'
import { ageYears, deletePlayer, listPlayers, playerName, setPlayerStatus } from '../../lib/data'
import { PlayerSheet } from './PlayerSheet'

const POSITION_LABEL: Record<string, string> = {
  PG: 'Base',
  SG: 'Escolta',
  SF: 'Alero',
  PF: 'Ala-pívot',
  C: 'Pívot',
}

type SortKey = 'name' | 'jersey'

export function RosterPage({ team }: { team: Team }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [showArchived, setShowArchived] = useState(false)
  const [sheet, setSheet] = useState<{ open: boolean; player: Player | null }>({
    open: false,
    player: null,
  })

  const canEdit = team.role === 'coach' || team.role === 'assistant'
  const canDelete = team.role === 'coach'

  const playersQuery = useQuery({
    queryKey: ['players', team.id],
    queryFn: () => listPlayers(team.id),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlayerStatus }) => setPlayerStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players', team.id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlayer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players', team.id] }),
  })

  const players = playersQuery.data ?? []
  const active = players.filter((player) => player.status !== 'archived')
  const minors = active.filter((player) => {
    const age = ageYears(player.birth_date)
    return age !== null && age < 18
  })

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return players
      .filter((player) => showArchived || player.status !== 'archived')
      .filter((player) => {
        if (!term) return true
        const name = playerName(player).toLowerCase()
        const jersey = player.jersey_number?.toString() ?? ''
        return name.includes(term) || jersey.includes(term)
      })
      .sort((a, b) => {
        if (sort === 'jersey') {
          if (a.jersey_number === null) return 1
          if (b.jersey_number === null) return -1
          return a.jersey_number - b.jersey_number
        }
        return playerName(a).localeCompare(playerName(b), 'es')
      })
  }, [players, search, showArchived, sort])

  const mutationError = statusMutation.error ?? deleteMutation.error

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Plantilla</h1>
          <p className="page-sub">
            {active.length} {active.length === 1 ? 'jugador' : 'jugadores'}
            {minors.length > 0 ? ` · ${minors.length} menor${minors.length === 1 ? '' : 'es'} de edad` : ''}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSheet({ open: true, player: null })}
          >
            Agregar jugador
          </button>
        ) : null}
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <label className="sr-only" htmlFor="roster-search">
            Buscar jugador
          </label>
          <input
            id="roster-search"
            type="search"
            className="field-input"
            placeholder="Buscar por nombre o dorsal"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="toolbar__controls">
          <select
            className="field-input field-select toolbar__select"
            aria-label="Ordenar por"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            <option value="name">Ordenar por apellido</option>
            <option value="jersey">Ordenar por dorsal</option>
          </select>

          <label className="check toolbar__check">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            <span>Incluir archivados</span>
          </label>
        </div>
      </div>

      {mutationError ? (
        <p className="form-error" role="alert">
          {mutationError instanceof Error ? mutationError.message : 'No se pudo completar la acción.'}
        </p>
      ) : null}

      {playersQuery.isLoading ? (
        <div className="table-skeleton" aria-live="polite" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="skeleton-row" />
          ))}
          <span className="sr-only">Cargando plantilla</span>
        </div>
      ) : playersQuery.isError ? (
        <div className="empty">
          <h2 className="empty__title">No se pudo cargar la plantilla</h2>
          <p className="empty__text">
            {playersQuery.error instanceof Error
              ? playersQuery.error.message
              : 'Revisa la conexión e inténtalo de nuevo.'}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => playersQuery.refetch()}>
            Reintentar
          </button>
        </div>
      ) : players.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">Todavía no hay jugadores</h2>
          <p className="empty__text">
            Agrega al primero con su dorsal y su posición. Los datos de contacto y del
            representante pueden esperar.
          </p>
          {canEdit ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSheet({ open: true, player: null })}
            >
              Agregar jugador
            </button>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">Nadie coincide con «{search}»</h2>
          <p className="empty__text">Prueba con otro nombre o borra el filtro.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setSearch('')}>
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th scope="col" className="col-num">
                  #
                </th>
                <th scope="col">Jugador</th>
                <th scope="col" className="col-optional">
                  Posición
                </th>
                <th scope="col" className="col-optional">
                  Edad
                </th>
                <th scope="col" className="col-optional">
                  Estado
                </th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((player) => {
                const age = ageYears(player.birth_date)
                const archived = player.status === 'archived'

                return (
                  <tr key={player.id} className={archived ? 'is-archived' : undefined}>
                    <td className="col-num mono">{player.jersey_number ?? '—'}</td>
                    <td>
                      <span className="roster-name">{playerName(player)}</span>
                      {age !== null && age < 18 ? <span className="tag">Menor</span> : null}
                    </td>
                    <td className="col-optional">
                      {player.position ? POSITION_LABEL[player.position] : '—'}
                    </td>
                    <td className="col-optional mono">{age ?? '—'}</td>
                    <td className="col-optional">
                      <span className={archived ? 'badge badge--muted' : 'badge'}>
                        {archived ? 'Archivado' : player.status === 'inactive' ? 'Inactivo' : 'Activo'}
                      </span>
                    </td>
                    <td className="col-actions">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setSheet({ open: true, player })}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="row-action"
                            onClick={() =>
                              statusMutation.mutate({
                                id: player.id,
                                status: archived ? 'active' : 'archived',
                              })
                            }
                          >
                            {archived ? 'Reactivar' : 'Archivar'}
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              className="row-action row-action--danger"
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `¿Eliminar a ${playerName(player)}? Si tiene historial de asistencia o evaluaciones, la base lo impedirá y deberás archivarlo.`,
                                )
                                if (confirmed) deleteMutation.mutate(player.id)
                              }}
                            >
                              Eliminar
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {sheet.open ? (
        <PlayerSheet
          key={sheet.player?.id ?? 'new'}
          teamId={team.id}
          player={sheet.player}
          onClose={() => setSheet({ open: false, player: null })}
        />
      ) : null}
    </div>
  )
}
