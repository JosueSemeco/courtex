import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPlayer, updatePlayer } from '../../lib/data'
import type { Player, PlayerDraft } from '../../lib/data'
import { SelectField, TextAreaField, TextField } from '../../components/Field'
import { emptyPlayerForm, playerSchema, toFieldErrors } from './schema'
import type { PlayerFormValues } from './schema'

type PlayerSheetProps = {
  teamId: string
  player: Player | null
  onClose: () => void
}

function toForm(player: Player | null): PlayerFormValues {
  if (!player) return emptyPlayerForm

  return {
    firstName: player.first_name,
    lastName: player.last_name,
    jerseyNumber: player.jersey_number?.toString() ?? '',
    heightCm: player.height_cm?.toString() ?? '',
    weightKg: player.weight_kg === null || player.weight_kg === undefined ? '' : String(player.weight_kg),
    position: player.position ?? '',
    dominantHand: player.dominant_hand ?? '',
    dominantEye: player.dominant_eye ?? '',
    birthDate: player.birth_date ?? '',
    email: player.email ?? '',
    phone: player.phone ?? '',
    guardianName: player.guardian_name ?? '',
    guardianPhone: player.guardian_phone ?? '',
    guardianEmail: player.guardian_email ?? '',
    notes: player.notes ?? '',
  }
}

const POSITIONS = [
  { value: '', label: 'Sin definir' },
  { value: 'PG', label: 'Base (1)' },
  { value: 'SG', label: 'Escolta (2)' },
  { value: 'SF', label: 'Alero (3)' },
  { value: 'PF', label: 'Ala-pívot (4)' },
  { value: 'C', label: 'Pívot (5)' },
]

const HANDS = [
  { value: '', label: 'Sin definir' },
  { value: 'right', label: 'Derecha' },
  { value: 'left', label: 'Izquierda' },
  { value: 'both', label: 'Ambas' },
]

const EYES = [
  { value: '', label: 'Sin definir' },
  { value: 'right', label: 'Derecho' },
  { value: 'left', label: 'Izquierdo' },
  { value: 'unknown', label: 'No evaluado' },
]

const FIELD_LABELS: Record<string, string> = {
  firstName: 'Nombre',
  lastName: 'Apellido',
  jerseyNumber: 'Dorsal',
  heightCm: 'Altura',
  weightKg: 'Peso',
  birthDate: 'Fecha de nacimiento',
  email: 'Correo del jugador',
  phone: 'Teléfono del jugador',
  guardianName: 'Representante',
  guardianPhone: 'Teléfono del representante',
  guardianEmail: 'Correo del representante',
  notes: 'Notas',
}

function toDraft(values: PlayerFormValues): PlayerDraft {
  const numeric = (value: string) => (value.trim() === '' ? null : Number(value))
  const text = (value: string) => value.trim() || null

  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    jersey_number: numeric(values.jerseyNumber),
    position: values.position || null,
    dominant_hand: values.dominantHand || null,
    dominant_eye: values.dominantEye || null,
    height_cm: numeric(values.heightCm),
    weight_kg: numeric(values.weightKg),
    birth_date: text(values.birthDate),
    email: text(values.email),
    phone: text(values.phone),
    guardian_name: text(values.guardianName),
    guardian_phone: text(values.guardianPhone),
    guardian_email: text(values.guardianEmail),
    notes: text(values.notes),
  }
}

export function PlayerSheet({ teamId, player, onClose }: PlayerSheetProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<PlayerFormValues>(() => toForm(player))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: (draft: PlayerDraft) =>
      player ? updatePlayer(player.id, draft) : createPlayer(teamId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', teamId] })
      onClose()
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el jugador.')
    },
  })

  useEffect(() => {
    document.getElementById('player-firstName')?.focus()
  }, [])

  useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus()
  }, [errors])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function set(key: keyof PlayerFormValues) {
    return (value: string) => {
      setValues((current) => ({ ...current, [key]: value }) as PlayerFormValues)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = playerSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setErrors({})
    mutation.mutate(toDraft(parsed.data))
  }

  const errorEntries = Object.entries(errors)

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-sheet-title"
      >
        <header className="sheet__head">
          <h2 className="sheet__title" id="player-sheet-title">
            {player ? 'Editar jugador' : 'Nuevo jugador'}
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
            {errorEntries.length > 0 ? (
              <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
                <p className="error-summary__title">Revisa estos datos</p>
                <ul>
                  {errorEntries.map(([key, message]) => (
                    <li key={key}>
                      <a href={`#player-${key}`} className="link-quiet">
                        {FIELD_LABELS[key] ?? key}: {message}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {formError ? (
              <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
                <p className="error-summary__title">{formError}</p>
              </div>
            ) : null}

            <div className="form-grid">
              <TextField
                name="player-firstName"
                label="Nombre"
                value={values.firstName}
                onChange={set('firstName')}
                autoComplete="off"
                error={errors.firstName}
              />
              <TextField
                name="player-lastName"
                label="Apellido"
                value={values.lastName}
                onChange={set('lastName')}
                autoComplete="off"
                error={errors.lastName}
              />
              <TextField
                name="player-jerseyNumber"
                label="Dorsal"
                value={values.jerseyNumber}
                onChange={set('jerseyNumber')}
                inputMode="numeric"
                error={errors.jerseyNumber}
              />
              <SelectField
                name="player-position"
                label="Posición"
                value={values.position}
                onChange={set('position')}
                options={POSITIONS}
              />
              <TextField
                name="player-birthDate"
                label="Fecha de nacimiento"
                type="date"
                value={values.birthDate}
                onChange={set('birthDate')}
                error={errors.birthDate}
              />
              <TextField
                name="player-heightCm"
                label="Altura (cm)"
                value={values.heightCm}
                onChange={set('heightCm')}
                inputMode="numeric"
                error={errors.heightCm}
              />
              <TextField
                name="player-weightKg"
                label="Peso (kg)"
                value={values.weightKg}
                onChange={set('weightKg')}
                inputMode="decimal"
                error={errors.weightKg}
              />
              <SelectField
                name="player-dominantHand"
                label="Mano dominante"
                value={values.dominantHand}
                onChange={set('dominantHand')}
                options={HANDS}
              />
              <SelectField
                name="player-dominantEye"
                label="Ojo dominante"
                value={values.dominantEye}
                onChange={set('dominantEye')}
                options={EYES}
                hint="Opcional."
              />
            </div>

            <p className="form-section">Contacto</p>
            <div className="form-grid">
              <TextField
                name="player-email"
                label="Correo del jugador"
                type="email"
                value={values.email}
                onChange={set('email')}
                error={errors.email}
              />
              <TextField
                name="player-phone"
                label="Teléfono del jugador"
                value={values.phone}
                onChange={set('phone')}
                inputMode="tel"
                error={errors.phone}
              />
            </div>

            <p className="form-section">Representante</p>
            <p className="form-note">
              Obligatorio antes de subir una foto si el jugador es menor de edad.
            </p>
            <div className="form-grid">
              <TextField
                name="player-guardianName"
                label="Nombre"
                value={values.guardianName}
                onChange={set('guardianName')}
                error={errors.guardianName}
              />
              <TextField
                name="player-guardianPhone"
                label="Teléfono"
                value={values.guardianPhone}
                onChange={set('guardianPhone')}
                inputMode="tel"
                error={errors.guardianPhone}
              />
              <TextField
                name="player-guardianEmail"
                label="Correo"
                type="email"
                value={values.guardianEmail}
                onChange={set('guardianEmail')}
                error={errors.guardianEmail}
                className="form-span"
              />
            </div>

            <TextAreaField
              name="player-notes"
              label="Notas"
              value={values.notes}
              onChange={set('notes')}
              error={errors.notes}
              hint="Sin datos médicos: esto no es una ficha clínica."
            />
          </div>

          <footer className="sheet__foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : player ? 'Guardar cambios' : 'Agregar jugador'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
