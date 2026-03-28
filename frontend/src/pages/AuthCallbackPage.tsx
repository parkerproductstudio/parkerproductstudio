/**
 * Supabase redirects email links (invite, recovery, magic link) here when
 * "Redirect URLs" includes /auth/callback. AuthProvider exchanges the ?code=.
 */
export function AuthCallbackPage() {
  return (
    <div className="auth-loading" role="status">
      Completing sign-in…
    </div>
  )
}
