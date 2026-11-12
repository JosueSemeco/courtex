import { useEffect, useState } from 'react'
import { auth } from '../../lib/auth'
import type { AuthUser } from '../../lib/auth'
import { CourtPanel } from './CourtPanel'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    auth.getSession().then((session) => {
      if (!active) return
      setUser(session)
      setChecking(false)
    })

    return () => {
      active = false
    }
  }, [])

  async function handleSignOut() {
    await auth.signOut()
    setUser(null)
    setMode('login')
  }

  return (
    <main className="auth-stage">
      <CourtPanel
        tone={mode === 'login' ? 'brand' : 'ink'}
        side={mode === 'login' ? 'start' : 'end'}
      />

      <section
        className="auth-form-area"
        data-side={mode === 'login' ? 'end' : 'start'}
        aria-labelledby="auth-heading"
      >
        {checking ? null : user ? (
          <div className="auth-done" key="signed-in">
            <h1 className="auth-title" id="auth-heading">
              Hola, {user.name.split(' ')[0]}.
            </h1>
            <p className="auth-sub">
              Tu sesión está abierta. El panel del equipo llega en el siguiente
              módulo.
            </p>
            <button type="button" className="btn btn-primary" onClick={handleSignOut}>
              Cerrar sesión
            </button>
          </div>
        ) : mode === 'login' ? (
          <LoginForm
            key="login"
            onSignedIn={setUser}
            onSwitch={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            key="register"
            onSignedIn={setUser}
            onSwitch={() => setMode('login')}
          />
        )}
      </section>
    </main>
  )
}
