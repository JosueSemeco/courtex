import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

type FieldChromeProps = {
  name: string
  label: string
  error?: string
  hint?: string
  className?: string
}

type FieldShellProps = FieldChromeProps & {
  children: ReactNode
}

function FieldShell({ name, label, error, hint, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      {children}
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

type TextFieldProps = FieldChromeProps & {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'date' | 'time'
  autoComplete?: string
  autoFocus?: boolean
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
}

export function TextField({
  name,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  autoFocus,
  inputMode,
  placeholder,
  error,
  hint,
  className,
}: TextFieldProps) {
  return (
    <FieldShell name={name} label={label} error={error} hint={hint} className={className}>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className="field-input"
      />
    </FieldShell>
  )
}

export function PasswordField({
  name,
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: TextFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <FieldShell name={name} label={label} error={error} hint={hint}>
      <div className="field-control">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
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
    </FieldShell>
  )
}

type SelectFieldProps = FieldChromeProps & {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  className,
}: SelectFieldProps) {
  return (
    <FieldShell name={name} label={label} error={error} hint={hint} className={className}>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className="field-input field-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

type TextAreaFieldProps = FieldChromeProps & {
  value: string
  onChange: (value: string) => void
  rows?: number
}

export function TextAreaField({
  name,
  label,
  value,
  onChange,
  rows = 3,
  error,
  hint,
  className,
}: TextAreaFieldProps) {
  return (
    <FieldShell name={name} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={name}
        name={name}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className="field-input field-textarea"
      />
    </FieldShell>
  )
}
