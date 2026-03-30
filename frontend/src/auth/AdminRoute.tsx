import { Navigate, Outlet } from 'react-router-dom'

import { useProjectAccess } from './useProjectAccess'

/** Requires `user_profiles.admin` (same as GET /api/auth/project-access). */
export function AdminRoute() {
  const { projectAccess, checking } = useProjectAccess()

  if (checking) {
    return (
      <div className="auth-loading" role="status">
        Loading…
      </div>
    )
  }

  if (!projectAccess) {
    return <Navigate to="/projects" replace />
  }

  return <Outlet />
}
