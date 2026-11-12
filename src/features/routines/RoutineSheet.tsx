import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  createRoutine,
  createRoutineItem,
  deleteRoutineItem,
  listRoutineItems,
  listRoutines,
  moveRoutineItem,
  updateRoutine,
  updateRoutineItem,
} from '../../lib/data'
import type { RoutineCategory, RoutineItem, RoutineItemDraft } from '../../lib/data'
import { SelectField, TextField } from '../../components/Field'

type RoutineSheetProps = {
  teamId: string
  routineId: string | null
  canEdit: boolean
  onClose: () => void
}

const CATEGORIES: Array<{ value: RoutineCategory; label: string }> = [
  { value: 'physical', label: 'Física' },
  { value: 'technical', label: 'Técnica' },
  { value: 'tactical', label: 'Táctica' },
  { value: 'shooting', label: 'Tiro' },
  { value: 'recovery', label: 'Recuperación' },
]

const categoryLabel = (value: RoutineCategory) =>
  CATEGORIES.find((category) => category.value === value)?.label ?? value

const routineSchema = z.object({
  name: z.string().trim().min(2, 'Escribe un nombre').max(80, 'Máximo 80 caracteres'),
  description: z.string().trim().max(300, 'Máximo 300 caracteres'),
})

const itemSchema = z.object({
  title: z.string().trim().min(2, 'Escribe el nombre del ejercicio').max(120, 'Máximo 120'),
  category: z.enum(['physical', 'technical', 'tactical', 'shooting', 'recovery']),
  duration: z
    .string()
    .trim()
    .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 1 && Number(value) <= 300), 'Entre 1 y 300 min'),
  sets: z
    .string()
    .trim()
    .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 1 && Number(value) <= 50), 'Entre 1 y 50'),
  reps: z
    .string()
    .trim()
    .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 1 && Number(value) <= 500), 'Entre 1 y 500'),
  notes: z.string().trim().max(300, 'Máximo 300 caracteres'),
})

type ItemForm = z.infer<typeof itemSchema>

const emptyItem: ItemForm = {
  title: '',
  category: 'technical',
  duration: '',
  sets: '',
  reps: '',
  notes: '',
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !errors[key]) errors[key] = issue.message
  }
  return errors
}

function toItemDraft(values: ItemForm): RoutineItemDraft {
  const number = (value: string) => (value.trim() === '' ? null : Number(value))
  return {
    title: values.title.trim(),
    category: values.category,
    duration_min: number(values.duration),
    sets: number(values.sets),
    reps: number(values.reps),
    notes: values.notes.trim() || null,
  }
}

export function RoutineSheet({ teamId, routineId, canEdit, onClose }: RoutineSheetProps) {
  const queryClient = useQueryClient()
  const routinesQuery = useQuery({
    queryKey: ['routines', teamId],
    queryFn: () => listRoutines(teamId),
  })
  const routine = routinesQuery.data?.find((candidate) => candidate.id === routineId) ?? null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [routineErrors, setRoutineErrors] = useState<Record<string, string>>({})

  const [editing, setEditing] = useState<{ mode: 'new' | 'edit'; itemId: string | null } | null>(
    null,
  )
  const [itemValues, setItemValues] = useState<ItemForm>(emptyItem)
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (routine) {
      setName(routine.name)
      setDescription(routine.description ?? '')
    }
  }, [routine])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const itemsQuery = useQuery({
    queryKey: ['routine-items', routineId],
    queryFn: () => listRoutineItems(routineId as string),
    enabled: Boolean(routineId),
  })
  const items = itemsQuery.data ?? []

  const routineMutation = useMutation({
    mutationFn: () =>
      routine
        ? updateRoutine(routine.id, { name: name.trim(), description: description.trim() || null })
        : createRoutine(teamId, { name: name.trim(), description: description.trim() || null }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['routines', teamId] })
      if (!routine) {
        setName(saved.name)
        onClose()
      }
    },
    onError: (error: unknown) =>
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la rutina.'),
  })

  const itemMutation = useMutation({
    mutationFn: async () => {
      if (!routineId) return
      const draft = toItemDraft(itemValues)
      if (editing?.mode === 'edit' && editing.itemId) {
        await updateRoutineItem(editing.itemId, draft)
      } else {
        const last = items[items.length - 1]
        await createRoutineItem(routineId, teamId, draft, (last?.position ?? 1000) + 1000)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-items', routineId] })
      setEditing(null)
      setItemValues(emptyItem)
      setItemErrors({})
    },
    onError: (error: unknown) =>
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el ejercicio.'),
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => deleteRoutineItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine-items', routineId] }),
    onError: (error: unknown) =>
      setFormError(error instanceof Error ? error.message : 'No se pudo eliminar el ejercicio.'),
  })

  const moveMutation = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const target = items[index]
      const neighbour = items[index + direction]
      if (!target || !neighbour) return
      await Promise.all([
        moveRoutineItem(target.id, neighbour.position),
        moveRoutineItem(neighbour.id, target.position),
      ])
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine-items', routineId] }),
  })

  function handleRoutineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = routineSchema.safeParse({ name, description })
    if (!parsed.success) {
      setRoutineErrors(toFieldErrors(parsed.error))
      return
    }
    setRoutineErrors({})
    routineMutation.mutate()
  }

  function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = itemSchema.safeParse(itemValues)
    if (!parsed.success) {
      setItemErrors(toFieldErrors(parsed.error))
      return
    }
    setItemErrors({})
    setItemValues(parsed.data)
    itemMutation.mutate()
  }

  function startEdit(item: RoutineItem) {
    setEditing({ mode: 'edit', itemId: item.id })
    setItemValues({
      title: item.title,
      category: item.category,
      duration: item.duration_min?.toString() ?? '',
      sets: item.sets?.toString() ?? '',
      reps: item.reps?.toString() ?? '',
      notes: item.notes ?? '',
    })
    setItemErrors({})
  }

  function setItem(key: keyof ItemForm) {
    return (value: string) => {
      setItemValues((current) => ({ ...current, [key]: value }) as ItemForm)
    }
  }

  return createPortal(
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="routine-sheet-title">
        <header className="sheet__head">
          <h2 className="sheet__title" id="routine-sheet-title">
            {routine ? routine.name : 'Nueva rutina'}
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

        <div className="sheet__body">
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <form onSubmit={handleRoutineSubmit} noValidate>
            <div className="auth-fields">
              <TextField
                name="routine-name"
                label="Nombre"
                value={name}
                onChange={setName}
                error={routineErrors.name}
                autoFocus={!routine}
              />
              <TextField
                name="routine-description"
                label="Descripción"
                value={description}
                onChange={setDescription}
                error={routineErrors.description}
                hint="Opcional. Para qué sirve esta rutina."
              />
            </div>

            {canEdit ? (
              <div className="sheet__inline-actions">
                <button type="submit" className="btn btn-ghost btn-small" disabled={routineMutation.isPending}>
                  {routineMutation.isPending ? 'Guardando…' : routine ? 'Guardar datos' : 'Crear rutina'}
                </button>
              </div>
            ) : null}
          </form>

          {routine ? (
            <section className="routine-items">
              <h3 className="form-section">Ejercicios</h3>

              {items.length === 0 ? (
                <p className="form-note">Todavía no hay ejercicios en esta rutina.</p>
              ) : (
                <ol className="item-list">
                  {items.map((item, index) => (
                    <li key={item.id} className="item-row">
                      <span className="item-row__order">{index + 1}</span>
                      <span className="item-row__main">
                        <span className="item-row__title">{item.title}</span>
                        <span className="item-row__meta">
                          {categoryLabel(item.category)}
                          {item.duration_min ? ` · ${item.duration_min} min` : ''}
                          {item.sets && item.reps ? ` · ${item.sets}×${item.reps}` : ''}
                        </span>
                      </span>
                      {canEdit ? (
                        <span className="item-row__actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--small"
                            onClick={() => moveMutation.mutate({ index, direction: -1 })}
                            disabled={index === 0}
                            aria-label={`Subir ${item.title}`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--small"
                            onClick={() => moveMutation.mutate({ index, direction: 1 })}
                            disabled={index === items.length - 1}
                            aria-label={`Bajar ${item.title}`}
                          >
                            ↓
                          </button>
                          <button type="button" className="row-action" onClick={() => startEdit(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="row-action row-action--danger"
                            onClick={() => removeItemMutation.mutate(item.id)}
                          >
                            Quitar
                          </button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}

              {canEdit ? (
                editing ? (
                  <form className="item-form" onSubmit={handleItemSubmit} noValidate>
                    <TextField
                      name="item-title"
                      label="Ejercicio"
                      value={itemValues.title}
                      onChange={setItem('title')}
                      error={itemErrors.title}
                    />
                    <div className="form-grid">
                      <SelectField
                        name="item-category"
                        label="Categoría"
                        value={itemValues.category}
                        onChange={setItem('category')}
                        options={CATEGORIES}
                      />
                      <TextField
                        name="item-duration"
                        label="Duración (min)"
                        value={itemValues.duration}
                        onChange={setItem('duration')}
                        inputMode="numeric"
                        error={itemErrors.duration}
                      />
                      <TextField
                        name="item-sets"
                        label="Series"
                        value={itemValues.sets}
                        onChange={setItem('sets')}
                        inputMode="numeric"
                        error={itemErrors.sets}
                      />
                      <TextField
                        name="item-reps"
                        label="Repeticiones"
                        value={itemValues.reps}
                        onChange={setItem('reps')}
                        inputMode="numeric"
                        error={itemErrors.reps}
                      />
                    </div>
                    <TextField
                      name="item-notes"
                      label="Notas"
                      value={itemValues.notes}
                      onChange={setItem('notes')}
                      error={itemErrors.notes}
                      hint="Opcional."
                    />
                    <div className="sheet__inline-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => {
                          setEditing(null)
                          setItemValues(emptyItem)
                          setItemErrors({})
                        }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary btn-small" disabled={itemMutation.isPending}>
                        {itemMutation.isPending ? 'Guardando…' : editing.mode === 'edit' ? 'Guardar ejercicio' : 'Agregar ejercicio'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      setEditing({ mode: 'new', itemId: null })
                      setItemValues(emptyItem)
                      setItemErrors({})
                    }}
                  >
                    Agregar ejercicio
                  </button>
                )
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  )
}
