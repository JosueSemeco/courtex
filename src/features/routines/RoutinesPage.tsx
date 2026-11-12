import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Team } from '../../lib/data'
import { deleteRoutine, listRoutines } from '../../lib/data'
import { RoutineSheet } from './RoutineSheet'

export function RoutinesPage({ team }: { team: Team }) {
  const queryClient = useQueryClient()
  const canEdit = team.role === 'coach' || team.role === 'assistant'
  const canDelete = team.role === 'coach'
  const [sheet, setSheet] = useState<{ open: boolean; routineId: string | null }>({
    open: false,
    routineId: null,
  })

  const routinesQuery = useQuery({
    queryKey: ['routines', team.id],
    queryFn: () => listRoutines(team.id),
  })

  const removeMutation = useMutation({
    mutationFn: (routineId: string) => deleteRoutine(routineId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines', team.id] }),
  })

  const routines = routinesQuery.data ?? []
  const mutationError = removeMutation.error

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Rutinas</h1>
          <p className="page-sub">
            <strong>{routines.length}</strong> {routines.length === 1 ? 'rutina' : 'rutinas'} de
            entrenamiento
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSheet({ open: true, routineId: null })}
          >
            Nueva rutina
          </button>
        ) : null}
      </div>

      {mutationError ? (
        <p className="form-error" role="alert">
          {mutationError instanceof Error ? mutationError.message : 'No se pudo eliminar la rutina.'}
        </p>
      ) : null}

      {routinesQuery.isLoading ? (
        <div className="table-skeleton" aria-live="polite" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="skeleton-row" />
          ))}
        </div>
      ) : routinesQuery.isError ? (
        <div className="empty">
          <h2 className="empty__title">No se pudieron cargar las rutinas</h2>
          <p className="empty__text">
            {routinesQuery.error instanceof Error
              ? routinesQuery.error.message
              : 'Revisa la conexión e inténtalo de nuevo.'}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => routinesQuery.refetch()}>
            Reintentar
          </button>
        </div>
      ) : routines.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">Todavía no hay rutinas</h2>
          <p className="empty__text">
            Arma una rutina con sus ejercicios y asígnala a un entrenamiento del calendario.
          </p>
          {canEdit ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSheet({ open: true, routineId: null })}
            >
              Nueva rutina
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="routine-list">
          {routines.map((routine) => (
            <li key={routine.id} className="routine-card">
              <button
                type="button"
                className="routine-card__main"
                onClick={() => setSheet({ open: true, routineId: routine.id })}
              >
                <span className="routine-card__name">{routine.name}</span>
                <span className="routine-card__desc">
                  {routine.description ?? 'Sin descripción'}
                </span>
              </button>
              {canDelete ? (
                <button
                  type="button"
                  className="row-action row-action--danger"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la rutina «${routine.name}»? Los eventos que la usaban quedarán sin rutina.`)) {
                      removeMutation.mutate(routine.id)
                    }
                  }}
                >
                  Eliminar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {sheet.open ? (
        <RoutineSheet
          key={sheet.routineId ?? 'new'}
          teamId={team.id}
          routineId={sheet.routineId}
          canEdit={canEdit}
          onClose={() => setSheet({ open: false, routineId: null })}
        />
      ) : null}
    </div>
  )
}
