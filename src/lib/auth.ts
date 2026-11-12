export type AuthUser = {
  id: string
  name: string
  email: string
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string }

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
  signIn(input: SignInInput): Promise<AuthResult>
  signUp(input: SignUpInput): Promise<AuthResult>
  signOut(): void
  currentUser(): AuthUser | null
}

type StoredUser = AuthUser & { passwordHash: string }

const USERS_KEY = 'courtex.users'
const SESSION_KEY = 'courtex.session'
const NETWORK_DELAY = 480

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

async function hashPassword(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Adaptador simulado: guarda las cuentas en localStorage con hash SHA-256.
// La UI solo conoce esta interfaz, así que se sustituye por Supabase sin tocarla.
export const auth: AuthAdapter = {
  async signIn({ email, password }) {
    await wait(NETWORK_DELAY)

    const normalized = normalizeEmail(email)
    const user = readUsers().find((candidate) => candidate.email === normalized)

    if (!user) {
      return { ok: false, error: 'No encontramos una cuenta con ese correo.' }
    }

    if ((await hashPassword(password)) !== user.passwordHash) {
      return { ok: false, error: 'La contraseña no coincide. Vuelve a intentarlo.' }
    }

    const session: AuthUser = { id: user.id, name: user.name, email: user.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { ok: true, user: session }
  },

  async signUp({ name, email, password }) {
    await wait(NETWORK_DELAY)

    const normalized = normalizeEmail(email)
    const users = readUsers()

    if (users.some((candidate) => candidate.email === normalized)) {
      return { ok: false, error: 'Ese correo ya tiene una cuenta. Inicia sesión.' }
    }

    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
    }

    writeUsers([...users, user])

    const session: AuthUser = { id: user.id, name: user.name, email: user.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { ok: true, user: session }
  },

  signOut() {
    localStorage.removeItem(SESSION_KEY)
  },

  currentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  },
}
