import { useState } from 'react'
import type { FormEvent } from 'react'
import { auth } from '../../lib/auth'
import type { AuthUser } from '../../lib/auth'
import { PasswordField, TextField } from '../../components/Field'
import { SubmitButton } from '../../components/SubmitButton'
import { registerSchema, toFieldErrors } from './schema'

type RegisterFormProps = {
  onSignedIn: (user: AuthUser) => void
  onSwitch: () => void
}

export function RegisterForm({ onSignedIn, onSwitch }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = registerSchema.safeParse({ name, email, password, accepted })
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setErrors({})
    setPending(true)
    const result = await auth.signUp(parsed.data)
    setPending(false)

    if (result.status === 'signed-in') {
      onSignedIn(result.user)
      return
    }

    if (result.status === 'confirmation-required') {
      setConfirmationEmail(result.email)
      return
    }

    setFormError(result.message)
  }

  if (confirmationEmail) {
    return (
      <div className="auth-form">
        <h1 className="auth-title" id="auth-heading">
          Revisa tu correo
        </h1>
        <p className="auth-sub">
          Enviamos un enlace de confirmación a <strong>{confirmationEmail}</strong>.
          Ábrelo y vuelve para entrar con tu cuenta.
        </p>
        <button type="button" className="btn btn-primary" onClick={onSwitch}>
          Ya confirmé, iniciar sesión
        </button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1 className="auth-title" id="auth-heading">
        Crea tu equipo
      </h1>
      <p className="auth-sub">
        Abres la cuenta como entrenador. Los asistentes y jugadores entran por
        invitación.
      </p>

      <div className="auth-fields">
        <TextField
          name="name"
          label="Nombre completo"
          autoComplete="name"
          value={name}
          onChange={setName}
          error={errors.name}
          autoFocus
        />

        <TextField
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />

        <PasswordField
          name="password"
          label="Contraseña"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          hint="Al menos 8 caracteres."
        />

        <div>
          <label className="check" htmlFor="accepted">
            <input
              id="accepted"
              name="accepted"
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              aria-invalid={errors.accepted ? true : undefined}
              aria-describedby={errors.accepted ? 'accepted-error' : undefined}
            />
            <span>
              Acepto el aviso de privacidad y el tratamiento de los datos de mi
              equipo y sus jugadores.
            </span>
          </label>
          {errors.accepted ? (
            <p className="field-error" id="accepted-error" role="alert">
              {errors.accepted}
            </p>
          ) : null}
        </div>
      </div>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Creando cuenta…">
        Crear cuenta
      </SubmitButton>

      <p className="auth-switch">
        ¿Ya tienes cuenta?{' '}
        <button type="button" className="link-quiet" onClick={onSwitch}>
          Iniciar sesión
        </button>
      </p>
    </form>
  )
}
