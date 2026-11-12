import { describe, expect, it } from 'vitest'
import { ageYears, playerName, translateDbError } from './data'

function dateYearsAgo(years: number, extraDays = 0): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  date.setDate(date.getDate() + extraDays)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

describe('edad del jugador', () => {
  it('devuelve null sin fecha o con fecha inválida', () => {
    expect(ageYears(null)).toBeNull()
    expect(ageYears('no-es-fecha')).toBeNull()
  })

  it('cuenta los años cumplidos', () => {
    expect(ageYears(dateYearsAgo(10))).toBe(10)
    expect(ageYears(dateYearsAgo(18))).toBe(18)
  })

  it('no adelanta el cumpleaños que aún no llega', () => {
    // Nacido mañana hace 18 años: todavía tiene 17.
    expect(ageYears(dateYearsAgo(18, 1))).toBe(17)
  })
})

describe('nombre para mostrar', () => {
  it('une nombre y apellido', () => {
    expect(playerName({ first_name: 'Ana', last_name: 'Pérez' })).toBe('Ana Pérez')
  })

  it('tolera apellido vacío', () => {
    expect(playerName({ first_name: 'Ana', last_name: '' })).toBe('Ana')
  })
})

describe('traducción de errores de Postgres', () => {
  it('explica el dorsal duplicado', () => {
    expect(
      translateDbError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "players_team_number_idx"',
      }),
    ).toMatch(/dorsal ya está en uso/i)
  })

  it('traduce un duplicado genérico', () => {
    expect(translateDbError({ code: '23505', message: 'duplicate key' })).toMatch(/ya existe/i)
  })

  it('explica que el jugador tiene historial', () => {
    expect(translateDbError({ code: '23503', message: 'violates foreign key' })).toMatch(/historial/i)
    expect(translateDbError({ code: '23503', message: 'violates foreign key' })).toMatch(/archívalo/i)
  })

  it('traduce el bloqueo por RLS como falta de permiso', () => {
    expect(translateDbError({ code: '42501', message: 'permission denied' })).toMatch(/permiso/i)
    expect(
      translateDbError({ message: 'new row violates row-level security policy for table "players"' }),
    ).toMatch(/permiso/i)
  })

  it('no inventa causas: lo desconocido es genérico', () => {
    expect(translateDbError({ message: 'algo raro' })).toMatch(/no se pudo completar/i)
  })
})
