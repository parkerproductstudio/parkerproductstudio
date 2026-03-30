import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

function authErrorMessage(code: string, detail: string | null): string {
  if (code === 'verify_failed') {
    return (
      detail ??
      'This confirmation link could not be verified. Try signing up again or request a new confirmation email from Supabase (Authentication → Users).'
    )
  }
  if (code === 'otp_expired' || code === 'access_denied') {
    return 'This sign-in link has expired or was already used. Password reset links are short-lived. Send yourself a fresh reset email below, or sign in if you know your password.'
  }
  if (detail) return detail
  return `Something went wrong (${code}). Try a new reset email or sign in.`
}

export function LoginPage() {
  const { supabase, session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/projects'

  const [urlAuthHint] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('auth_error')
    if (!code) return null
    return authErrorMessage(code, params.get('detail'))
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [resetEmail, setResetEmail] = useState('')
  const [resetSending, setResetSending] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !session) return
    navigate(from, { replace: true })
  }, [loading, session, from, navigate])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.get('auth_error')) return
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    setSubmitting(true)
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)
    if (signError) {
      setError(signError.message)
      return
    }
    navigate(from, { replace: true })
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setResetMessage(null)
    if (!supabase) {
      setResetMessage('Supabase is not configured.')
      return
    }
    const addr = resetEmail.trim()
    if (!addr) {
      setResetMessage('Enter your email.')
      return
    }
    setResetSending(true)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      addr,
      { redirectTo },
    )
    setResetSending(false)
    if (resetError) {
      setResetMessage(resetError.message)
      return
    }
    setResetMessage(
      'If that address is in the system, we sent a reset link. Check your inbox and use the new link soon—it expires quickly.',
    )
  }

  return (
    <div className="site auth-page">
      <header className="header">
        <div className="header-inner">
          <Link className="brand" to="/">
            <img
              src="/brand/logo.png"
              width={40}
              height={40}
              alt=""
              decoding="async"
            />
            Parker Product Studio
          </Link>
        </div>
      </header>
      <main className="auth-main">
        <div className="auth-panel">
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">
            Access private projects. Use the account you configured in Supabase.
          </p>
          {urlAuthHint ? (
            <p className="auth-banner" role="alert">
              {urlAuthHint}
            </p>
          ) : null}
          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true" />

          <h2 className="auth-section-title">Forgot password?</h2>
          <p className="auth-sub auth-sub-tight">
            We will email you a fresh link. Open it soon—it expires quickly.
          </p>
          <form
            className="auth-form"
            onSubmit={(e) => void handlePasswordReset(e)}
          >
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                name="resetEmail"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {resetMessage ? (
              <p
                className={
                  resetMessage.startsWith('If that address')
                    ? 'auth-info'
                    : 'auth-error'
                }
              >
                {resetMessage}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn btn-ghost auth-submit"
              disabled={resetSending}
            >
              {resetSending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="auth-footer">
            Need an account? <Link to="/signup">Sign up</Link>
          </p>
          <p className="auth-footer">
            <Link to="/">← Back to site</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
