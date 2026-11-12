import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre completo')
    .max(80, 'Máximo 80 caracteres'),
  email: z.email('Escribe un correo válido'),
  password: z.string().min(8, 'Usa al menos 8 caracteres'),
  accepted: z
    .boolean()
    .refine((value) => value, 'Necesitamos tu aceptación para crear la cuenta'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

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
