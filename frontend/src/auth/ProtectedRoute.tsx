import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'
import { ProjectAccessDeniedPage } from '../pages/ProjectAccessDeniedPage'

type AccessState = 'unknown' | 'allowed' | 'denied' | 'error'

export function ProtectedRoute() {
  const { session, loading, supabase } = useAuth()
  const location = useLocation()
  const [access, setAccess] = useState<AccessState>('unknown')

  useEffect(() => {
    if (loading) return
    if (!session?.access_token) {
      setAccess('unknown')
      return
    }

    let cancelled = false
    setAccess('unknown')

    void fetch('/api/auth/project-access', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          await supabase?.auth.signOut()
          return { kind: 'abort' as const }
        }
        if (!r.ok) return { kind: 'error' as const }
        const body = (await r.json()) as { projectAccess?: boolean }
        return {
          kind: 'ok' as const,
          projectAccess: Boolean(body.projectAccess),
        }
      })
      .then((data) => {
        if (cancelled || data.kind === 'abort') return
        if (data.kind === 'error') setAccess('error')
        else setAccess(data.projectAccess ? 'allowed' : 'denied')
      })
      .catch(() => {
        if (!cancelled) setAccess('error')
      })

    return () => {
      cancelled = true
    }
  }, [loading, session?.access_token, supabase])

  if (loading || (session && access === 'unknown')) {
    return (
      <div className="auth-loading" role="status">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (access === 'denied') {
    return <ProjectAccessDeniedPage />
  }

  if (access === 'error') {
    return (
      <div className="auth-page site">
        <main className="auth-main">
          <div className="auth-panel">
            <h1 className="auth-title">Could not verify access</h1>
            <p className="auth-sub">
              The server could not confirm project access. Try again in a moment.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return <Outlet />
}
