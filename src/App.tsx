import { useEffect, useState } from 'react'
import { AuthScreen } from './features/auth/AuthScreen'
import { AppShell } from './app/AppShell'
import { auth } from './lib/auth'
import type { AuthUser } from './lib/auth'

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    let active = true

    auth.getSession().then((session) => {
      if (active) setUser(session)
    })

    return () => {
      active = false
    }
  }, [])

  if (user === undefined) {
    return <div className="boot" aria-hidden="true" />
  }

  if (!user) {
    return <AuthScreen onSignedIn={setUser} />
  }

  return (
    <AppShell
      user={user}
      onSignOut={async () => {
        await auth.signOut()
        setUser(null)
      }}
    />
  )
}
