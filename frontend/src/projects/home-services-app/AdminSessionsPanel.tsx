import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiUrl } from '../../lib/apiUrl'

export type AdminSessionRow = {
  id: string
  created_at: string
  updated_at: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  job_summary: string | null
  supplies: string[]
}

type SessionsResponse = {
  company: { slug: string; name: string }
  sessions: AdminSessionRow[]
}

function sessionHasSummaryAndSupplies(s: AdminSessionRow): boolean {
  const summary = s.job_summary?.trim()
  const supplies = (s.supplies ?? []).filter(
    (x) => typeof x === 'string' && x.trim().length > 0,
  )
  return Boolean(summary) && supplies.length > 0
}

export type AdminSessionsPanelProps = {
  /** When false, skips fetch (e.g. tab not selected). */
  active: boolean
  accessToken: string | undefined
  accessChecking: boolean
  projectAccess: boolean
  companySlug: string
  /** Path (+ optional search) for post-login redirect from embed demo. */
  loginReturnPath?: string
  variant: 'studio' | 'embed'
  headingId?: string
  title?: string
}

export function AdminSessionsPanel({
  active,
  accessToken,
  accessChecking,
  projectAccess,
  companySlug,
  loginReturnPath,
  variant,
  headingId = 'admin-sessions-heading',
  title,
}: AdminSessionsPanelProps) {
  const [sessions, setSessions] = useState<AdminSessionRow[]>([])
  const [company, setCompany] = useState<{ slug: string; name: string } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canFetch =
    active &&
    Boolean(accessToken) &&
    projectAccess &&
    !accessChecking

  useEffect(() => {
    if (!canFetch || !accessToken) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const q = new URLSearchParams({ companySlug })
    void fetch(
      apiUrl(`/api/projects/home-services-app/sessions?${q.toString()}`),
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? r.statusText)
        }
        return r.json() as Promise<SessionsResponse>
      })
      .then((data) => {
        if (cancelled) return
        setCompany(data.company)
        setSessions(data.sessions)
        setError(null)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setSessions([])
        setCompany(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, accessToken, canFetch, companySlug])

  if (!active) return null

  const defaultTitle =
    variant === 'studio'
      ? 'Parker Electric — intake conversations'
      : 'Intake conversations (admin demo)'

  const loginState =
    loginReturnPath != null
      ? { from: { pathname: loginReturnPath } }
      : { from: { pathname: '/projects/home-services-app' } }

  const metaClass = variant === 'studio' ? 'panel-meta' : 'embed-hs-admin-meta'
  const errClass = variant === 'studio' ? 'auth-error' : 'embed-hs-error'
  const mutedClass = variant === 'studio' ? 'panel-muted' : 'embed-hs-muted'

  const visibleSessions = sessions.filter(sessionHasSummaryAndSupplies)

  return (
    <section
      className={variant === 'studio' ? 'project-panel' : 'embed-hs-admin'}
      aria-labelledby={headingId}
    >
      <h2 className={variant === 'embed' ? 'embed-hs-admin-title' : undefined} id={headingId}>
        {title ?? defaultTitle}
      </h2>
      <p className={metaClass}>
        <code>
          GET /api/projects/home-services-app/sessions?companySlug={companySlug}
        </code>
        {company ? (
          <>
            {' '}
            · {company.name}
          </>
        ) : null}
      </p>

      {accessChecking && accessToken ? (
        <p className={mutedClass}>Checking access…</p>
      ) : null}

      {!accessToken ? (
        <p className={mutedClass}>
          Sign in with a studio admin account to view intake sessions.{' '}
          <Link to="/login" state={loginState}>
            Sign in
          </Link>
        </p>
      ) : null}

      {accessToken && !accessChecking && !projectAccess ? (
        <p className={mutedClass}>
          Your account does not have studio admin access. Ask an owner to set{' '}
          <code>user_profiles.admin</code>, or open the{' '}
          <Link to="/projects">projects hub</Link>.
        </p>
      ) : null}

      {canFetch && error ? <p className={errClass}>{error}</p> : null}
      {canFetch && loading ? <p className={mutedClass}>Loading…</p> : null}
      {canFetch && !loading && !error && sessions.length === 0 ? (
        <p className={mutedClass}>No sessions yet.</p>
      ) : null}
      {canFetch &&
      !loading &&
      !error &&
      sessions.length > 0 &&
      visibleSessions.length === 0 ? (
        <p className={mutedClass}>
          No sessions with both a job summary and supplies yet. Those fields fill in
          after the embed chat runs extraction on assistant replies.
        </p>
      ) : null}
      {canFetch && !loading && !error && visibleSessions.length > 0 ? (
        <div className="admin-sessions-scroll">
          <table className="admin-sessions-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Address</th>
                <th scope="col">Email</th>
                <th scope="col">Job summary</th>
                <th scope="col">Supplies</th>
                <th scope="col">Started</th>
              </tr>
            </thead>
            <tbody>
              {visibleSessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.customer_name ?? '—'}</td>
                  <td>{s.customer_phone ?? '—'}</td>
                  <td>{s.customer_address ?? '—'}</td>
                  <td>{s.customer_email ?? '—'}</td>
                  <td className="admin-sessions-cell-wrap">
                    {(s.job_summary ?? '').trim()}
                  </td>
                  <td className="admin-sessions-cell-wrap">
                    {(s.supplies ?? [])
                      .filter((x) => typeof x === 'string' && x.trim())
                      .join(', ')}
                  </td>
                  <td>
                    <time dateTime={s.created_at}>
                      {new Date(s.created_at).toLocaleString()}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
