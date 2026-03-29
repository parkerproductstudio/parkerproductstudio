export function parseAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_ADMIN_EMAILS?.trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Project UI/API access: only emails listed in ALLOWED_ADMIN_EMAILS (comma-separated).
 * Empty list means nobody has access until the server is configured (safe default with public sign-up).
 */
export function emailHasProjectAccess(email: string | undefined): boolean {
  const allowed = parseAllowedEmails()
  if (allowed.length === 0) return false
  return allowed.includes((email ?? '').toLowerCase())
}
