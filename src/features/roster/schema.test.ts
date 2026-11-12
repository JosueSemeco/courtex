import { describe, expect, it } from 'vitest'
import { emptyPlayerForm, playerSchema, toFieldErrors } from './schema'
import type { PlayerFormValues } from './schema'

const valid: PlayerFormValues = {
  ...emptyPlayerForm,
  firstName: 'Ana',
  lastName: 'Pérez',
}

function errorsOf(input: Partial<PlayerFormValues>): Record<string, string> | null {
  const parsed = playerSchema.safeParse({ ...valid, ...input })
  if (parsed.success) return null
  return toFieldErrors(parsed.error)
}

function isoDateYearsAgo(years: number, extraDays = 0): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  date.setDate(date.getDate() + extraDays)
  return date.toISOString().slice(0, 10)
}

describe('validación de la ficha del jugador', () => {
  it('acepta solo con nombre y apellido', () => {
    expect(errorsOf({})).toBeNull()
  })

  it('rechaza nombre y apellido vacíos o en blanco', () => {
    const errors = errorsOf({ firstName: '   ', lastName: '' })

    expect(errors).not.toBeNull()
    expect(errors?.firstName).toMatch(/nombre/i)
    expect(errors?.lastName).toMatch(/apellido/i)
  })

  it('acepta los extremos del dorsal y rechaza fuera de rango', () => {
    expect(errorsOf({ jerseyNumber: '0' })).toBeNull()
    expect(errorsOf({ jerseyNumber: '99' })).toBeNull()
    expect(errorsOf({ jerseyNumber: '100' })?.jerseyNumber).toMatch(/0 a 99/)
    expect(errorsOf({ jerseyNumber: '-1' })?.jerseyNumber).toMatch(/0 a 99/)
    expect(errorsOf({ jerseyNumber: 'abc' })?.jerseyNumber).toMatch(/0 a 99/)
  })

  it('acepta dorsal vacío como sin definir', () => {
    expect(errorsOf({ jerseyNumber: '' })).toBeNull()
  })

  it('valida el rango de altura y de peso', () => {
    expect(errorsOf({ heightCm: '120' })).toBeNull()
    expect(errorsOf({ heightCm: '250' })).toBeNull()
    expect(errorsOf({ heightCm: '119' })?.heightCm).toMatch(/120 a 250/)
    expect(errorsOf({ weightKg: '30' })).toBeNull()
    expect(errorsOf({ weightKg: '75.5' })).toBeNull()
    expect(errorsOf({ weightKg: '200' })).toBeNull()
    expect(errorsOf({ weightKg: '200.5' })?.weightKg).toMatch(/30 a 200/)
    expect(errorsOf({ weightKg: '201' })?.weightKg).toMatch(/30 a 200/)
  })

  it('rechaza fechas de nacimiento futuras o imposibles', () => {
    expect(errorsOf({ birthDate: isoDateYearsAgo(-1) })?.birthDate).toMatch(/fecha/i)
    expect(errorsOf({ birthDate: '1899-12-31' })?.birthDate).toMatch(/fecha/i)
    expect(errorsOf({ birthDate: '2010-02-01' })).toBeNull()
    expect(errorsOf({ birthDate: '' })).toBeNull()
  })

  it('valida los correos solo cuando hay algo escrito', () => {
    expect(errorsOf({ email: '' })).toBeNull()
    expect(errorsOf({ email: 'ana@club.com' })).toBeNull()
    expect(errorsOf({ email: 'ana-club.com' })?.email).toMatch(/correo/i)
    expect(errorsOf({ guardianEmail: 'sin-arroba' })?.guardianEmail).toMatch(/correo/i)
  })

  it('rechaza notas de más de 500 caracteres', () => {
    expect(errorsOf({ notes: 'a'.repeat(501) })?.notes).toMatch(/500/)
    expect(errorsOf({ notes: 'a'.repeat(500) })).toBeNull()
  })

  it('conserva el primer error de cada campo y descarta rutas no textuales', () => {
    const errors = toFieldErrors({
      issues: [
        { code: 'custom', path: ['firstName'], message: 'primero' },
        { code: 'custom', path: ['firstName'], message: 'segundo' },
        { code: 'custom', path: [], message: 'sin ruta' },
      ],
    } as never)

    expect(errors.firstName).toBe('primero')
    expect(Object.keys(errors)).toHaveLength(1)
  })
})
