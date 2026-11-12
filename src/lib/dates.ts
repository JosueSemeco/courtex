const DAY_LONG = new Intl.DateTimeFormat('es-VE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const MONTH_LONG = new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' })
const TIME = new Intl.DateTimeFormat('es-VE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const SHORT = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short' })

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // lunes = 0
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - offset)
    date.setDate(date.getDate() + index)
    return date
  })
}

export function formatMonth(year: number, month: number): string {
  return capitalize(MONTH_LONG.format(new Date(year, month, 1)))
}

export function formatDayLong(date: Date): string {
  return capitalize(DAY_LONG.format(date))
}

export function formatShortDate(date: Date): string {
  return SHORT.format(date)
}

export function formatTime(iso: string): string {
  return TIME.format(new Date(iso))
}

export function combineDateAndTime(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00`).toISOString()
}

export function timeOf(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
