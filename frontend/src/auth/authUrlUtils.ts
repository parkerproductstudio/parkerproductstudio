import type { Session } from '@supabase/supabase-js'

function decodeDescription(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '))
  } catch {
    return raw
  }
}

/**
 * Supabase may put errors in the query string (e.g. /auth/callback?error=...)
 * or in the hash (#error=...).
 */
export function parseAuthRedirectError(): {
  code: string
  description: string
} | null {
  const url = new URL(window.location.href)

  let err = url.searchParams.get('error')
  let code = url.searchParams.get('error_code')
  let description = url.searchParams.get('error_description') ?? ''

  if (!err) {
    const raw = url.hash?.replace(/^#/, '') ?? ''
    if (!raw) return null
    const hp = new URLSearchParams(raw)
    err = hp.get('error')
    code = hp.get('error_code')
    description = hp.get('error_description') ?? ''
  }

  if (!err) return null

  return {
    code: code || err || 'unknown',
    description: decodeDescription(description),
  }
}

/** Remove query + hash after handling auth redirect errors. */
export function stripAuthRedirectFromUrl(): void {
  window.history.replaceState(null, '', window.location.pathname)
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
