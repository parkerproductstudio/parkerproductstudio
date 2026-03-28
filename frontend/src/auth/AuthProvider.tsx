import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { AuthContext } from './authContext'
import { createSupabaseBrowserClient } from '../lib/supabaseClient'

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [remoteReady, setRemoteReady] = useState(() => !supabase)

  useEffect(() => {
    if (!supabase) {
      return
    }

    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return
      setSession(s)
      setRemoteReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const loading = Boolean(supabase) && !remoteReady

  const value = useMemo(
    () => ({ supabase, session, loading }),
    [supabase, session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
