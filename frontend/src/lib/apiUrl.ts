/**
 * Express API base URL with no trailing slash. When empty, requests use relative
 * paths so the SPA and API share one origin (or Vite’s /api proxy in dev).
 */
export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
}

/** Build a full URL for an API path (must start with `/`, e.g. `/api/health`). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  if (!base) return p
  return `${base}${p}`
}
