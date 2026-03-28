import type { Session } from '@supabase/supabase-js'

/** Parse Supabase error redirects: `#error=access_denied&error_code=otp_expired&...` */
export function parseAuthHashError(): {
  code: string
  description: string
} | null {
  const raw = window.location.hash?.replace(/^#/, '') ?? ''
  if (!raw) return null
  const params = new URLSearchParams(raw)
  if (!params.get('error')) return null
  const code = params.get('error_code') || params.get('error') || 'unknown'
  let description = params.get('error_description') ?? ''
  try {
    description = decodeURIComponent(description.replace(/\+/g, ' '))
  } catch {
    /* keep raw */
  }
  return { code, description }
}

export function clearUrlHash(): void {
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Password-recovery sessions include `amr` with method `recovery` in the access token. */
export function sessionUsesRecoveryAmr(session: Session | null): boolean {
  if (!session?.access_token) return false
  const payload = decodeJwtPayload(session.access_token)
  const amr = payload?.amr
  if (!Array.isArray(amr)) return false
  return amr.some((entry) => {
    if (entry === 'recovery') return true
    if (typeof entry === 'object' && entry !== null && 'method' in entry) {
      return (entry as { method: string }).method === 'recovery'
    }
    return false
  })
}
