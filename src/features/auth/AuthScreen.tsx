import { useState } from 'react'
import type { AuthUser } from '../../lib/auth'
import { CourtPanel } from './CourtPanel'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type Mode = 'login' | 'register'

type AuthScreenProps = {
  onSignedIn: (user: AuthUser) => void
}

export function AuthScreen({ onSignedIn }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login')

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
        {mode === 'login' ? (
          <LoginForm key="login" onSignedIn={onSignedIn} onSwitch={() => setMode('register')} />
        ) : (
          <RegisterForm
            key="register"
            onSignedIn={onSignedIn}
            onSwitch={() => setMode('login')}
          />
        )}
      </section>
    </main>
  )
}
