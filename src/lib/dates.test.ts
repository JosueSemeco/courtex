import { describe, expect, it } from 'vitest'
import {
  combineDateAndTime,
  formatTime,
  isSameDay,
  monthGrid,
  parseDateKey,
  timeOf,
  toDateKey,
} from './dates'

describe('claves de fecha', () => {
  it('ida y vuelta conserva el día local', () => {
    const original = new Date(2026, 10, 12)
    const key = toDateKey(original)

    expect(key).toBe('2026-11-12')
    expect(toDateKey(parseDateKey(key))).toBe(key)
  })
})

describe('rejilla del mes', () => {
  it('siempre son 42 celdas y empieza en lunes', () => {
    const days = monthGrid(2026, 10) // noviembre de 2026

    expect(days).toHaveLength(42)
    expect(days[0].getDay()).toBe(1) // lunes
  })

  it('contiene el primer día del mes', () => {
    const days = monthGrid(2026, 10)
    const first = days.find((day) => day.getDate() === 1 && day.getMonth() === 10)

    expect(first).toBeDefined()
  })

  it('trae los días del mes anterior para completar la semana', () => {
    const days = monthGrid(2026, 10)

    expect(days[0].getMonth()).toBe(9) // 26 de octubre
  })
})

describe('horas', () => {
  it('combina fecha y hora en la zona local', () => {
    const iso = combineDateAndTime('2026-11-12', '17:30')
    const date = new Date(iso)

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10)
    expect(date.getDate()).toBe(12)
    expect(date.getHours()).toBe(17)
    expect(date.getMinutes()).toBe(30)
  })

  it('muestra la hora en formato de 24 horas', () => {
    const iso = combineDateAndTime('2026-11-12', '17:30')

    expect(formatTime(iso)).toBe('17:30')
    expect(timeOf(iso)).toBe('17:30')
  })
})

describe('comparación de días', () => {
  it('ignora la hora', () => {
    const morning = new Date(2026, 10, 12, 8, 0)
    const night = new Date(2026, 10, 12, 23, 59)

    expect(isSameDay(morning, night)).toBe(true)
    expect(isSameDay(morning, new Date(2026, 10, 13, 0, 1))).toBe(false)
  })
})
