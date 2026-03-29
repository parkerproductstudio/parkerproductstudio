import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

export function SignupPage() {
  const { supabase, session, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !session) return
    navigate('/projects', { replace: true })
  }, [loading, session, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDoneMessage(null)
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo },
    })
    setSubmitting(false)
    if (signErr) {
      setError(signErr.message)
      return
    }
    if (data.session) {
      navigate('/projects', { replace: true })
      return
    }
    setDoneMessage(
      'Check your email to confirm your address, then sign in. If confirmation is disabled in Supabase, try signing in now.',
    )
  }

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        Loading…
      </div>
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
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-sub">
            Public sign up is open. Private project areas stay limited to allowed
            accounts on the server.
          </p>
          {doneMessage ? (
            <p className="auth-info" role="status">
              {doneMessage}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label className="form-field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting || Boolean(doneMessage)}
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-footer">
            <Link to="/">← Back to site</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
