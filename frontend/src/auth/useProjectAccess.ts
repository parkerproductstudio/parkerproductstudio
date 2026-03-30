import { useEffect, useState } from 'react'

import { apiUrl } from '../lib/apiUrl'
import { useAuth } from './useAuth'

/**
 * Mirrors GET /api/auth/project-access — true only for allowlisted emails.
 */
export function useProjectAccess(): {
  projectAccess: boolean
  checking: boolean
} {
  const { session, loading: authLoading } = useAuth()
  const [projectAccess, setProjectAccess] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!session?.access_token) {
      setProjectAccess(false)
      setChecking(false)
      return
    }

    let cancelled = false
    setChecking(true)

    void fetch(apiUrl('/api/auth/project-access'), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        if (!r.ok) return false
        const body = (await r.json()) as { projectAccess?: boolean }
        return Boolean(body.projectAccess)
      })
      .then((allowed) => {
        if (!cancelled) {
          setProjectAccess(allowed)
          setChecking(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectAccess(false)
          setChecking(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, session?.access_token])

  return { projectAccess, checking }
}
