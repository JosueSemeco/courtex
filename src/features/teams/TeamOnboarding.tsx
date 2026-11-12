import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeam } from '../../lib/data'
import type { Team } from '../../lib/data'
import { TextField } from '../../components/Field'

type TeamOnboardingProps = {
  onCreated: (team: Team) => void
}

export function TeamOnboarding({ onCreated }: TeamOnboardingProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [season, setSeason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createTeam({ name: name.trim(), category: category.trim() || null, season: season.trim() || null }),
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      onCreated(team)
    },
    onError: (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el equipo.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (name.trim().length < 2) {
      setError('El nombre del equipo necesita al menos 2 caracteres.')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="onboarding">
      <h1 className="page-title">Crea tu primer equipo</h1>
      <p className="auth-sub">
        El equipo se crea contigo como entrenador y trae cinco criterios de evaluación listos para
        usar. Podrás invitar asistentes y jugadores después.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-fields">
          <TextField
            name="team-name"
            label="Nombre del equipo"
            value={name}
            onChange={setName}
            autoFocus
            autoComplete="off"
          />
          <div className="form-grid">
            <TextField
              name="team-category"
              label="Categoría"
              value={category}
              onChange={setCategory}
              hint="Opcional. Por ejemplo: U16, Sub-19, Libre."
            />
            <TextField
              name="team-season"
              label="Temporada"
              value={season}
              onChange={setSeason}
              hint="Opcional. Por ejemplo: 2026."
            />
          </div>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creando…' : 'Crear equipo'}
        </button>
      </form>
    </div>
  )
}
