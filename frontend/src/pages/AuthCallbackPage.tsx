/**
 * Supabase sends users here after email actions when "Redirect URLs" includes
 * this path (or /auth/confirm with a token_hash template). AuthProvider handles
 * ?code= (PKCE), ?token_hash=&type= (verifyOtp), or hash tokens (implicit).
 */
export function AuthCallbackPage() {
  return (
    <div className="auth-loading" role="status">
      Completing sign-in…
    </div>
  )
}
