import { useEffect, useRef, useState } from 'react'

import { apiUrl } from '../lib/apiUrl'
import { useAuth } from './useAuth'

/**
 * Mirrors GET /api/auth/project-access — true when user_profiles.admin is true.
 * Refetches when the tab becomes visible so DB admin changes apply without a full reload.
 */
export function useProjectAccess(): {
  projectAccess: boolean
  /** True while the latest access check is in flight */
  checking: boolean
} {
  const { session, loading: authLoading } = useAuth()
  const [projectAccess, setProjectAccess] = useState(false)
  const [checking, setChecking] = useState(false)
  const genRef = useRef(0)

  useEffect(() => {
    if (authLoading) return

    if (!session?.access_token) {
      setProjectAccess(false)
      setChecking(false)
      return
    }

    const token = session.access_token

    const runCheck = () => {
      const gen = ++genRef.current
      setChecking(true)

      void fetch(apiUrl('/api/auth/project-access'), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (r) => {
          if (gen !== genRef.current) return null
          if (!r.ok) {
            if (import.meta.env.DEV) {
              const text = await r.text().catch(() => '')
              console.warn(
                '[useProjectAccess] /api/auth/project-access',
                r.status,
                text,
              )
            }
            return false
          }
          const body = (await r.json()) as { projectAccess?: boolean }
          return Boolean(body.projectAccess)
        })
        .then((allowed) => {
          if (gen !== genRef.current || allowed === null) return
          setProjectAccess(allowed)
        })
        .catch((e) => {
          if (gen !== genRef.current) return
          if (import.meta.env.DEV) {
            console.warn('[useProjectAccess] fetch failed', e)
          }
          setProjectAccess(false)
        })
        .finally(() => {
          if (gen === genRef.current) setChecking(false)
        })
    }

    runCheck()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') runCheck()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      genRef.current += 1
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [authLoading, session?.access_token, session?.user?.id])

  return { projectAccess, checking }
}
