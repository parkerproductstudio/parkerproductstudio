import { createContext } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

export type AuthContextValue = {
  supabase: SupabaseClient | null
  session: Session | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
