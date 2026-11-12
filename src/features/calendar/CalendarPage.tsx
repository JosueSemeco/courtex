import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EventDraft, Team, TeamEvent } from '../../lib/data'
import { listEvents, listRoutines, updateEvent } from '../../lib/data'
import {
  WEEKDAYS,
  formatDayLong,
  formatMonth,
  formatTime,
  isSameDay,
  monthGrid,
  parseDateKey,
  toDateKey,
} from '../../lib/dates'
import { EventSheet } from './EventSheet'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  in_progress: 'En curso',
  completed: 'Terminado',
  canceled: 'Cancelado',
}

function toDraft(event: TeamEvent, status: TeamEvent['status']): EventDraft {
  return {
    type: event.type,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    opponent: event.opponent,
    home_away: event.home_away,
    routine_id: event.routine_id,
    status,
    notes: event.notes,
  }
}

export function CalendarPage({ team }: { team: Team }) {
  const queryClient = useQueryClient()
  const canEdit = team.role === 'coach' || team.role === 'assistant'
  const canDelete = team.role === 'coach'

  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedKey, setSelectedKey] = useState(toDateKey(today))
  const [sheet, setSheet] = useState<{ open: boolean; event: TeamEvent | null; date: string }>({
    open: false,
    event: null,
    date: toDateKey(today),
  })

  const eventsQuery = useQuery({
    queryKey: ['events', team.id],
    queryFn: () => listEvents(team.id),
  })
  const routinesQuery = useQuery({
    queryKey: ['routines', team.id],
    queryFn: () => listRoutines(team.id),
  })

  const statusMutation = useMutation({
    mutationFn: ({ event, status }: { event: TeamEvent; status: TeamEvent['status'] }) =>
      updateEvent(event.id, toDraft(event, status)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', team.id] }),
  })

  const events = eventsQuery.data ?? []
  const routines = routinesQuery.data ?? []

  const byDay = useMemo(() => {
    const map = new Map<string, TeamEvent[]>()
    for (const event of events) {
      const key = toDateKey(new Date(event.starts_at))
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])

  const monthEvents = events.filter((event) => {
    const date = new Date(event.starts_at)
    return date.getFullYear() === cursor.year && date.getMonth() === cursor.month
  })
  const trainings = monthEvents.filter((event) => event.type === 'training').length
  const matches = monthEvents.filter((event) => event.type === 'match').length

  const selected = byDay.get(selectedKey) ?? []
  const selectedDate = parseDateKey(selectedKey)

  function shiftMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedKey(toDateKey(next))
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedKey(toDateKey(today))
  }

  const mutationError = statusMutation.error

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Calendario</h1>
          <p className="page-sub">
            <strong>{trainings}</strong> {trainings === 1 ? 'entrenamiento' : 'entrenamientos'} ·{' '}
            <strong>{matches}</strong> {matches === 1 ? 'partido' : 'partidos'} este mes
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSheet({ open: true, event: null, date: selectedKey })}
          >
            Nuevo evento
          </button>
        ) : null}
      </div>

      <div className="cal-bar">
        <button type="button" className="icon-btn icon-btn--light" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <p className="cal-month">{formatMonth(cursor.year, cursor.month)}</p>
        <button type="button" className="icon-btn icon-btn--light" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={goToday}>
          Hoy
        </button>
      </div>

      {mutationError ? (
        <p className="form-error" role="alert">
          {mutationError instanceof Error ? mutationError.message : 'No se pudo actualizar el evento.'}
        </p>
      ) : null}

      <div className="cal-grid" aria-label="Calendario mensual">
        {WEEKDAYS.map((label) => (
          <div key={label} className="cal-weekday" aria-hidden="true">
            {label}
          </div>
        ))}

        {days.map((day) => {
          const key = toDateKey(day)
          const dayEvents = byDay.get(key) ?? []
          const outside = day.getMonth() !== cursor.month
          const isToday = isSameDay(day, today)
          const isSelected = key === selectedKey

          return (
            <button
              key={key}
              type="button"
              className={[
                'cal-day',
                outside ? 'is-outside' : '',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                dayEvents.length > 0 ? 'has-events' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setSelectedKey(key)
                if (outside) setCursor({ year: day.getFullYear(), month: day.getMonth() })
              }}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
            >
              <span className="sr-only">
                {formatDayLong(day)}
                {dayEvents.length
                  ? `, ${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}`
                  : ', sin eventos'}
              </span>
              <span className="cal-day__num" aria-hidden="true">{day.getDate()}</span>
              <span className="cal-day__events" aria-hidden="true">
                {dayEvents.slice(0, 2).map((event) => (
                  <span key={event.id} className={`cal-chip cal-chip--${event.type}`}>
                    {formatTime(event.starts_at)} {event.title}
                  </span>
                ))}
                {dayEvents.length > 2 ? (
                  <span className="cal-more">+{dayEvents.length - 2}</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <section className="day-panel" aria-live="polite">
        <header className="day-panel__head">
          <h2 className="day-panel__title">{formatDayLong(selectedDate)}</h2>
          {canEdit ? (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setSheet({ open: true, event: null, date: selectedKey })}
            >
              Agregar aquí
            </button>
          ) : null}
        </header>

        {selected.length === 0 ? (
          <p className="day-panel__empty">Sin eventos este día.</p>
        ) : (
          <ul className="event-list">
            {selected.map((event) => (
              <li key={event.id} className="event-row">
                <span className="event-row__time">{formatTime(event.starts_at)}</span>
                <span className={`event-row__dot event-row__dot--${event.type}`} aria-hidden="true" />
                <span className="event-row__main">
                  <span className="event-row__title">{event.title}</span>
                  <span className="event-row__meta">
                    {event.type === 'match' ? 'Partido' : 'Entrenamiento'}
                    {event.opponent ? ` · vs ${event.opponent}` : ''}
                    {event.routine_id
                      ? ` · ${routines.find((routine) => routine.id === event.routine_id)?.name ?? 'Rutina'}`
                      : ''}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.status !== 'scheduled' ? ` · ${STATUS_LABEL[event.status]}` : ''}
                  </span>
                </span>
                {canEdit ? (
                  <span className="event-row__actions">
                    <button
                      type="button"
                      className="row-action"
                      onClick={() => setSheet({ open: true, event, date: selectedKey })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="row-action"
                      onClick={() =>
                        statusMutation.mutate({
                          event,
                          status: event.status === 'canceled' ? 'scheduled' : 'canceled',
                        })
                      }
                    >
                      {event.status === 'canceled' ? 'Reactivar' : 'Cancelar'}
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheet.open ? (
        <EventSheet
          key={sheet.event?.id ?? `new-${sheet.date}`}
          teamId={team.id}
          event={sheet.event}
          defaultDate={sheet.date}
          routines={routines}
          canDelete={canDelete}
          onClose={() => setSheet({ open: false, event: null, date: selectedKey })}
        />
      ) : null}
    </div>
  )
}
