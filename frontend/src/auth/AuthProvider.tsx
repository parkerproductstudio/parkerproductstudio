import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

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
      const url = new URL(window.location.href)
      const hasCode = url.searchParams.has('code')
      const pathOk = CALLBACK_PATHS.has(url.pathname)

      if (hasCode && pathOk && !pkceHandledRef.current) {
        pkceHandledRef.current = true
        const { error } = await client.auth.exchangeCodeForSession(
          window.location.href,
        )
        if (error) {
          console.error('Supabase auth callback:', error.message)
          pkceHandledRef.current = false
        } else if (!cancelled) {
          navigate('/projects', { replace: true })
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
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s)
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
