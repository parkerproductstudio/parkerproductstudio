import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

export function ProjectAccessDeniedPage() {
  const { supabase } = useAuth()
  const navigate = useNavigate()

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    navigate('/', { replace: true })
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
          <h1 className="auth-title">No project access</h1>
          <p className="auth-sub">
            You are signed in, but this workspace is limited to specific accounts.
            If you think this is a mistake, contact the site owner.
          </p>
          <div className="cta-row" style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
            <Link className="btn btn-ghost" to="/">
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
