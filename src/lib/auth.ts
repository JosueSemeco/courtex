import { supabase } from './supabase'

export type AuthUser = {
  id: string
  name: string
  email: string
}

export type AuthOutcome =
  | { status: 'signed-in'; user: AuthUser }
  | { status: 'confirmation-required'; email: string }
  | { status: 'error'; message: string }

export type SignInInput = {
  email: string
  password: string
}

export type SignUpInput = {
  name: string
  email: string
  password: string
}

export interface AuthAdapter {
  signIn(input: SignInInput): Promise<AuthOutcome>
  signUp(input: SignUpInput): Promise<AuthOutcome>
  signOut(): Promise<void>
  getSession(): Promise<AuthUser | null>
}

type RemoteUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

function toAuthUser(user: RemoteUser | null | undefined): AuthUser | null {
  if (!user) return null

  const metadataName = user.user_metadata?.full_name
  const fallback = (user.email ?? '').split('@')[0]
  const name =
    typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : fallback

  return { id: user.id, name, email: user.email ?? '' }
}

function translateAuthError(message: string): string {
  const known: Array<[RegExp, string]> = [
    [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
    [/email not confirmed/i, 'Confirma tu correo antes de entrar. Revisa tu bandeja.'],
    [
      /already registered|already been registered/i,
      'Ese correo ya tiene una cuenta. Inicia sesión.',
    ],
    [/password should be at least/i, 'La contraseña es demasiado corta.'],
    [/unable to validate email|invalid email/i, 'Escribe un correo válido.'],
    [/signups? not allowed/i, 'El registro está desactivado en este proyecto.'],
    [/rate limit|too many requests/i, 'Demasiados intentos. Espera un minuto.'],
  ]

  for (const [pattern, text] of known) {
    if (pattern.test(message)) return text
  }

  return 'No pudimos completar la operación. Inténtalo de nuevo.'
}

// Adaptador real contra Supabase Auth.
const supabaseAuth: AuthAdapter = {
  async signIn({ email, password }) {
    if (!supabase) return { status: 'error', message: 'Falta la configuración de Supabase.' }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) return { status: 'error', message: translateAuthError(error.message) }

    const user = toAuthUser(data.user)
    if (!user) return { status: 'error', message: 'Supabase no devolvió la sesión.' }

    return { status: 'signed-in', user }
  },

  async signUp({ name, email, password }) {
    if (!supabase) return { status: 'error', message: 'Falta la configuración de Supabase.' }

    const normalized = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { full_name: name.trim() } },
    })

    if (error) return { status: 'error', message: translateAuthError(error.message) }

    // Sin sesión significa que el proyecto exige confirmar el correo.
    if (!data.session) return { status: 'confirmation-required', email: normalized }

    const user = toAuthUser(data.user)
    if (!user) return { status: 'error', message: 'Supabase no devolvió la sesión.' }

    return { status: 'signed-in', user }
  },

  async signOut() {
    await supabase?.auth.signOut()
  },

  async getSession() {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return toAuthUser(data.session?.user ?? null)
  },
}

// Adaptador local: permite usar la pantalla sin proyecto de Supabase.
type StoredUser = AuthUser & { passwordHash: string }

const USERS_KEY = 'courtex.users'
const SESSION_KEY = 'courtex.session'

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}

async function hashPassword(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const localAuth: AuthAdapter = {
  async signIn({ email, password }) {
    await delay(420)

    const normalized = email.trim().toLowerCase()
    const user = readUsers().find((candidate) => candidate.email === normalized)

    if (!user) return { status: 'error', message: 'No encontramos una cuenta con ese correo.' }

    if ((await hashPassword(password)) !== user.passwordHash) {
      return { status: 'error', message: 'La contraseña no coincide. Vuelve a intentarlo.' }
    }

    const session: AuthUser = { id: user.id, name: user.name, email: user.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { status: 'signed-in', user: session }
  },

  async signUp({ name, email, password }) {
    await delay(420)

    const normalized = email.trim().toLowerCase()
    const users = readUsers()

    if (users.some((candidate) => candidate.email === normalized)) {
      return { status: 'error', message: 'Ese correo ya tiene una cuenta. Inicia sesión.' }
    }

    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
    }

    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]))

    const session: AuthUser = { id: user.id, name: user.name, email: user.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { status: 'signed-in', user: session }
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY)
  },

  async getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  },
}

export const auth: AuthAdapter = supabase ? supabaseAuth : localAuth
