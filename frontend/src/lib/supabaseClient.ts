import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: {
      // Implicit flow (default for client-only SPAs): email confirm / magic links put
      // tokens in the URL hash, so links work from any device. Forced PKCE breaks
      // confirmation when the email is opened in another browser (no code_verifier).
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}
