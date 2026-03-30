import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'
import { apiUrl } from '../lib/apiUrl'
import { ProjectAccessDeniedPage } from '../pages/ProjectAccessDeniedPage'

type AccessState = 'unknown' | 'allowed' | 'denied' | 'error'

export function ProtectedRoute() {
  const { session, loading, supabase } = useAuth()
  const location = useLocation()
  const [access, setAccess] = useState<AccessState>('unknown')
  const [accessErrorDetail, setAccessErrorDetail] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!session?.access_token) {
      setAccess('unknown')
      return
    }

    let cancelled = false
    setAccess('unknown')
    setAccessErrorDetail(null)

    void fetch(apiUrl('/api/auth/project-access'), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          await supabase?.auth.signOut()
          return { kind: 'abort' as const }
        }
        if (!r.ok) {
          let message: string | undefined
          try {
            const body = (await r.json()) as { error?: string }
            if (typeof body.error === 'string') message = body.error
          } catch {
            /* ignore */
          }
          return {
            kind: 'error' as const,
            status: r.status,
            message,
          }
        }
        const body = (await r.json()) as { projectAccess?: boolean }
        return {
          kind: 'ok' as const,
          projectAccess: Boolean(body.projectAccess),
        }
      })
      .then((data) => {
        if (cancelled || data.kind === 'abort') return
        if (data.kind === 'error') {
          setAccessErrorDetail(
            data.status === 503
              ? data.message ??
                  'The server cannot validate your session. On Render (or any host), set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the Web Service—not only the VITE_ variables used at build time.'
              : data.message ?? `Unexpected response (${data.status}).`,
          )
          setAccess('error')
        } else setAccess(data.projectAccess ? 'allowed' : 'denied')
      })
      .catch(() => {
        if (!cancelled) {
          setAccessErrorDetail(
            'Network error while contacting the server. If you use local dev, ensure the API is running and Vite proxies /api to the backend.',
          )
          setAccess('error')
        }
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
              {accessErrorDetail ??
                'The server could not confirm project access. Try again in a moment.'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  return <Outlet />
}
