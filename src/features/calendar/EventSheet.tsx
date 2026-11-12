import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { createEvent, deleteEvent, updateEvent } from '../../lib/data'
import type { EventDraft, Routine, TeamEvent } from '../../lib/data'
import { combineDateAndTime, timeOf, toDateKey } from '../../lib/dates'
import { SelectField, TextAreaField, TextField } from '../../components/Field'
import { toFieldErrors } from '../roster/schema'

type EventSheetProps = {
  teamId: string
  event: TeamEvent | null
  defaultDate: string
  routines: Routine[]
  canDelete: boolean
  onClose: () => void
}

const eventSchema = z
  .object({
    type: z.enum(['training', 'match']),
    title: z.string().trim().min(2, 'Escribe un título').max(120, 'Máximo 120 caracteres'),
    date: z.string().min(1, 'Elige la fecha'),
    startTime: z.string().min(1, 'Elige la hora de inicio'),
    endTime: z.string(),
    location: z.string().trim().max(120, 'Máximo 120 caracteres'),
    opponent: z.string().trim().max(80, 'Máximo 80 caracteres'),
    routineId: z.string(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']),
    notes: z.string().trim().max(500, 'Máximo 500 caracteres'),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'match' && values.opponent.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['opponent'], message: 'Un partido necesita rival' })
    }
    if (values.endTime && values.endTime <= values.startTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'Debe terminar después de empezar',
      })
    }
  })

type EventForm = z.infer<typeof eventSchema>

function toForm(event: TeamEvent | null, defaultDate: string): EventForm {
  if (!event) {
    return {
      type: 'training',
      title: '',
      date: defaultDate,
      startTime: '18:00',
      endTime: '20:00',
      location: '',
      opponent: '',
      routineId: '',
      status: 'scheduled',
      notes: '',
    }
  }

  return {
    type: event.type,
    title: event.title,
    date: toDateKey(new Date(event.starts_at)),
    startTime: timeOf(event.starts_at),
    endTime: event.ends_at ? timeOf(event.ends_at) : '',
    location: event.location ?? '',
    opponent: event.opponent ?? '',
    routineId: event.routine_id ?? '',
    status: event.status,
    notes: event.notes ?? '',
  }
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  date: 'Fecha',
  startTime: 'Hora de inicio',
  endTime: 'Hora de fin',
  opponent: 'Rival',
  location: 'Sede',
  notes: 'Notas',
}

export function EventSheet({
  teamId,
  event,
  defaultDate,
  routines,
  canDelete,
  onClose,
}: EventSheetProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<EventForm>(() => toForm(event, defaultDate))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (draft: EventDraft) =>
      event ? updateEvent(event.id, draft) : createEvent(teamId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', teamId] })
      onClose()
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el evento.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => deleteEvent(event!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', teamId] })
      onClose()
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : 'No se pudo eliminar el evento.')
    },
  })

  useEffect(() => {
    document.getElementById('event-title')?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function set(key: keyof EventForm) {
    return (value: string) => {
      setValues((current) => ({ ...current, [key]: value }) as EventForm)
    }
  }

  function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    setFormError(null)

    const parsed = eventSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setErrors({})
    const data = parsed.data
    const draft: EventDraft = {
      type: data.type,
      title: data.title.trim(),
      starts_at: combineDateAndTime(data.date, data.startTime),
      ends_at: data.endTime ? combineDateAndTime(data.date, data.endTime) : null,
      location: data.location.trim() || null,
      opponent: data.type === 'match' ? data.opponent.trim() || null : null,
      home_away: data.type === 'match' ? 'home' : null,
      routine_id: data.type === 'training' ? data.routineId || null : null,
      status: data.status,
      notes: data.notes.trim() || null,
    }

    mutation.mutate(draft)
  }

  const errorEntries = Object.entries(errors)

  return createPortal(
    <div
      className="sheet-backdrop"
      onMouseDown={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose()
      }}
    >
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="event-sheet-title">
        <header className="sheet__head">
          <h2 className="sheet__title" id="event-sheet-title">
            {event ? 'Editar evento' : 'Nuevo evento'}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <form className="sheet__form" onSubmit={handleSubmit} noValidate>
          <div className="sheet__body">
            {errorEntries.length > 0 || formError ? (
              <div className="error-summary" role="alert">
                <p className="error-summary__title">
                  {formError ?? 'Revisa estos datos'}
                </p>
                {errorEntries.length > 0 ? (
                  <ul>
                    {errorEntries.map(([key, message]) => (
                      <li key={key}>
                        <a href={`#event-${key}`} className="link-quiet">
                          {FIELD_LABELS[key] ?? key}: {message}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="form-grid">
              <SelectField
                name="event-type"
                label="Tipo"
                value={values.type}
                onChange={set('type')}
                options={[
                  { value: 'training', label: 'Entrenamiento' },
                  { value: 'match', label: 'Partido' },
                ]}
              />
              <SelectField
                name="event-status"
                label="Estado"
                value={values.status}
                onChange={set('status')}
                options={[
                  { value: 'scheduled', label: 'Programado' },
                  { value: 'in_progress', label: 'En curso' },
                  { value: 'completed', label: 'Terminado' },
                  { value: 'canceled', label: 'Cancelado' },
                ]}
              />
            </div>

            <TextField
              name="event-title"
              label="Título"
              value={values.title}
              onChange={set('title')}
              error={errors.title}
            />

            <div className="form-grid">
              <TextField
                name="event-date"
                label="Fecha"
                type="date"
                value={values.date}
                onChange={set('date')}
                error={errors.date}
              />
              <span />
              <TextField
                name="event-startTime"
                label="Inicio"
                type="time"
                value={values.startTime}
                onChange={set('startTime')}
                error={errors.startTime}
              />
              <TextField
                name="event-endTime"
                label="Fin"
                type="time"
                value={values.endTime}
                onChange={set('endTime')}
                error={errors.endTime}
                hint="Opcional."
              />
            </div>

            {values.type === 'match' ? (
              <TextField
                name="event-opponent"
                label="Rival"
                value={values.opponent}
                onChange={set('opponent')}
                error={errors.opponent}
              />
            ) : (
              <SelectField
                name="event-routineId"
                label="Rutina"
                value={values.routineId}
                onChange={set('routineId')}
                options={[
                  { value: '', label: 'Sin rutina' },
                  ...routines.map((routine) => ({ value: routine.id, label: routine.name })),
                ]}
              />
            )}

            <TextField
              name="event-location"
              label="Sede"
              value={values.location}
              onChange={set('location')}
              error={errors.location}
              hint="Opcional."
            />

            <TextAreaField
              name="event-notes"
              label="Notas"
              value={values.notes}
              onChange={set('notes')}
              error={errors.notes}
            />
          </div>

          <footer className="sheet__foot">
            {event && canDelete ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm(`¿Eliminar «${event.title}»? Se borran también su asistencia y evaluaciones.`)) {
                    removeMutation.mutate()
                  }
                }}
              >
                Eliminar
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}
