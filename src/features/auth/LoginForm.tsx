import { useState } from 'react'
import type { FormEvent } from 'react'
import { auth } from '../../lib/auth'
import type { AuthUser } from '../../lib/auth'
import { PasswordField, TextField } from '../../components/Field'
import { SubmitButton } from '../../components/SubmitButton'
import { loginSchema, toFieldErrors } from './schema'

type LoginFormProps = {
  onSignedIn: (user: AuthUser) => void
  onSwitch: () => void
}

export function LoginForm({ onSignedIn, onSwitch }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setErrors({})
    setPending(true)
    const result = await auth.signIn(parsed.data)
    setPending(false)

    if (result.status === 'signed-in') {
      onSignedIn(result.user)
      return
    }

    if (result.status === 'confirmation-required') {
      setFormError('Confirma tu correo antes de entrar. Revisa tu bandeja.')
      return
    }

    setFormError(result.message)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1 className="auth-title" id="auth-heading">
        Inicia sesión
      </h1>
      <p className="auth-sub">
        Entra con tu cuenta de entrenador para volver a tu equipo.
      </p>

      <div className="auth-fields">
        <TextField
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoFocus
        />

        <PasswordField
          name="password"
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
      </div>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Entrando…">
        Entrar
      </SubmitButton>

      <p className="auth-switch">
        ¿Todavía no tienes cuenta?{' '}
        <button type="button" className="link-quiet" onClick={onSwitch}>
          Crear equipo
        </button>
      </p>
    </form>
  )
}
