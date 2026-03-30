import { getSupabaseAdmin } from './supabaseAdmin.js'

/** True when user_profiles.admin is true for this auth user (service role read). */
export async function userHasProjectAccess(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  if (!admin) return false

  const { data, error } = await admin
    .from('user_profiles')
    .select('admin')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[userProjectAccess] Supabase error:', error.message)
    return false
  }
  if (!data) {
    console.warn(
      '[userProjectAccess] no user_profiles row for id',
      userId,
      '(run supabase/migrations/002_user_profiles.sql)',
    )
    return false
  }
  return Boolean(data.admin)
}
