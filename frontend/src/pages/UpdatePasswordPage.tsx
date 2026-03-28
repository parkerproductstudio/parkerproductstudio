import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

export function UpdatePasswordPage() {
  const { supabase, session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate('/login', { replace: true })
    }
  }, [loading, session, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error: upError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (upError) {
      setError(upError.message)
      return
    }
    navigate('/projects', { replace: true })
  }

  if (loading || !session) {
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
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-sub">
            You opened a valid recovery link. Choose a new password for your
            account.
          </p>
          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="form-field">
              <span>New password</span>
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
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>
          <p className="auth-footer">
            <Link to="/login">← Back to sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
