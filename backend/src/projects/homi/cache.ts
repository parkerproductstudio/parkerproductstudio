import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js'
import type { Address } from './providers/types.js'
import type { ProviderName, ProviderResult } from './providers/types.js'

type CachedResult = ProviderResult & { fetchedAt: string }

/** Read a cached lookup. Returns null if no row exists. */
export async function readCache(
  provider: ProviderName,
  addressKey: string,
): Promise<CachedResult | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('homi_provider_lookups')
    .select('status, normalized, raw, error_message, fetched_at')
    .eq('provider', provider)
    .eq('address_key', addressKey)
    .maybeSingle()

  if (error || !data) return null

  const row = data as {
    status: string
    normalized: unknown
    raw: unknown
    error_message: string | null
    fetched_at: string
  }

  if (row.status === 'ok') {
    return {
      ok: true,
      data: row.normalized as ProviderResult extends { ok: true; data: infer D } ? D : never,
      raw: row.raw,
      fetchedAt: row.fetched_at,
    } as CachedResult
  }

  const reason =
    row.status === 'not_found' || row.status === 'rate_limited' ? row.status : 'error'
  return {
    ok: false,
    reason,
    message: row.error_message ?? 'Unknown error',
    fetchedAt: row.fetched_at,
  } as CachedResult
}

/** Write a fresh lookup result to the cache. Idempotent on (provider, address_key). */
export async function writeCache(
  provider: ProviderName,
  addr: Address,
  addressKey: string,
  result: ProviderResult,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  const row = {
    provider,
    address_key: addressKey,
    street: addr.street,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
    status: result.ok ? 'ok' : result.reason,
    normalized: result.ok ? result.data : null,
    raw: result.ok ? result.raw : null,
    error_message: result.ok ? null : result.message,
  }

  await supabase
    .from('homi_provider_lookups')
    .upsert(row, { onConflict: 'provider,address_key' })
}
