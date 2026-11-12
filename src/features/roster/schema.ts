import { z } from 'zod'

const optionalNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (!Number.isNaN(Number(value)) && Number(value) >= min && Number(value) <= max),
      message,
    )

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Escribe un correo válido')

export const playerSchema = z.object({
  firstName: z.string().trim().min(1, 'Escribe el nombre').max(60, 'Máximo 60 caracteres'),
  lastName: z.string().trim().min(1, 'Escribe el apellido').max(60, 'Máximo 60 caracteres'),
  jerseyNumber: optionalNumber(0, 99, 'El dorsal va de 0 a 99'),
  heightCm: optionalNumber(120, 250, 'La altura va de 120 a 250 cm'),
  weightKg: optionalNumber(30, 200, 'El peso va de 30 a 200 kg'),
  position: z.enum(['', 'PG', 'SG', 'SF', 'PF', 'C']),
  dominantHand: z.enum(['', 'right', 'left', 'both']),
  dominantEye: z.enum(['', 'right', 'left', 'unknown']),
  birthDate: z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') return true
      const date = new Date(`${value}T00:00:00`)
      return !Number.isNaN(date.getTime()) && date <= new Date() && date > new Date('1900-01-01')
    }, 'Escribe una fecha de nacimiento válida'),
  email: optionalEmail,
  phone: z.string().trim().max(40, 'Máximo 40 caracteres'),
  guardianName: z.string().trim().max(80, 'Máximo 80 caracteres'),
  guardianPhone: z.string().trim().max(40, 'Máximo 40 caracteres'),
  guardianEmail: optionalEmail,
  notes: z.string().trim().max(500, 'Máximo 500 caracteres'),
})

export type PlayerFormValues = z.infer<typeof playerSchema>

export const emptyPlayerForm: PlayerFormValues = {
  firstName: '',
  lastName: '',
  jerseyNumber: '',
  heightCm: '',
  weightKg: '',
  position: '',
  dominantHand: '',
  dominantEye: '',
  birthDate: '',
  email: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  notes: '',
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !errors[key]) {
      errors[key] = issue.message
    }
  }

  return errors
}
