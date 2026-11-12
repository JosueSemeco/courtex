import { useState } from 'react'

type FieldProps = {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email'
  autoComplete?: string
  hint?: string
  error?: string
  autoFocus?: boolean
}

export function TextField({
  name,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
  error,
  autoFocus,
}: FieldProps) {
  const descriptionId = error ? `${name}-error` : hint ? `${name}-hint` : undefined

  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <div className="field-control">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className="field-input"
        />
      </div>
      {error ? (
        <p className="field-error" id={`${name}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function PasswordField({
  name,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  error,
}: FieldProps) {
  const [visible, setVisible] = useState(false)
  const descriptionId = error ? `${name}-error` : hint ? `${name}-hint` : undefined

  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <div className="field-control">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className="field-input field-input--has-toggle"
        />
        <button
          type="button"
          className="field-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-controls={name}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {error ? (
        <p className="field-error" id={`${name}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
