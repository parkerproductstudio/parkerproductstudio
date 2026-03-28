import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const { supabase } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/projects'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
          <p className="auth-footer">
            <Link to="/">← Back to site</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
