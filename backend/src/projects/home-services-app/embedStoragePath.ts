/**
 * Storage objects for embed uploads use `{companyId}/{sessionId}/{filename}`.
 * Reject traversal and cross-session reads.
 */
export function isAllowedEmbedStoragePath(
  companyId: string,
  sessionId: string,
  path: string,
): boolean {
  const p = path.trim().replace(/^\/+/, '')
  if (!p || p.includes('..') || p.includes('\\')) return false
  const prefix = `${companyId}/${sessionId}/`
  if (!p.startsWith(prefix)) return false
  const rest = p.slice(prefix.length)
  if (!rest || rest.includes('/')) return false
  return /^[a-zA-Z0-9._-]+$/.test(rest)
}
