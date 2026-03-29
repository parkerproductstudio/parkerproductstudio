import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

import {
  parseAuthRedirectError,
  sessionUsesRecoveryAmr,
  stripAuthRedirectFromUrl,
} from './authUrlUtils'
import { AuthContext } from './authContext'
import { createSupabaseBrowserClient } from '../lib/supabaseClient'

const CALLBACK_PATHS = new Set(['/', '/login', '/auth/callback'])

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [remoteReady, setRemoteReady] = useState(() => !supabase)
  const pkceHandledRef = useRef(false)

  useEffect(() => {
    if (!supabase) {
      return
    }

    const client: SupabaseClient = supabase
    let cancelled = false

    async function boot() {
      const redirectErr = parseAuthRedirectError()
      if (redirectErr && CALLBACK_PATHS.has(window.location.pathname)) {
        stripAuthRedirectFromUrl()
        const q = new URLSearchParams({
          auth_error: redirectErr.code,
          ...(redirectErr.description
            ? { detail: redirectErr.description.slice(0, 500) }
            : {}),
        })
        navigate(`/login?${q.toString()}`, { replace: true })
      }

      const url = new URL(window.location.href)
      const hasCode = url.searchParams.has('code')
      const pathOk = CALLBACK_PATHS.has(url.pathname)

      if (hasCode && pathOk && !pkceHandledRef.current) {
        pkceHandledRef.current = true
        const { data, error } = await client.auth.exchangeCodeForSession(
          window.location.href,
        )
        if (error) {
          console.error('Supabase auth callback:', error.message)
          pkceHandledRef.current = false
        } else if (!cancelled && data.session) {
          window.history.replaceState(null, '', url.pathname)
          if (sessionUsesRecoveryAmr(data.session)) {
            navigate('/auth/update-password', { replace: true })
          } else {
            navigate('/projects', { replace: true })
          }
        }
      }

      const {
        data: { session: s },
      } = await client.auth.getSession()
      if (cancelled) return
      setSession(s)
      setRemoteReady(true)
    }

    void boot()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY' && s) {
        navigate('/auth/update-password', { replace: true })
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, navigate])

  const loading = Boolean(supabase) && !remoteReady

  const value = useMemo(
    () => ({ supabase, session, loading }),
    [supabase, session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
