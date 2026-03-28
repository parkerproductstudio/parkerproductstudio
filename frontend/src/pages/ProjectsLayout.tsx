import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

export function ProjectsLayout() {
  const { supabase, session } = useAuth()
  const navigate = useNavigate()

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="site projects-site">
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
          <nav className="nav" aria-label="Projects">
            <Link to="/projects">Projects</Link>
            <span className="nav-user" title={session?.user.email ?? ''}>
              {session?.user.email}
            </span>
            <button type="button" className="btn-text" onClick={() => void signOut()}>
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="main projects-main">
        <Outlet />
      </main>
    </div>
  )
}
