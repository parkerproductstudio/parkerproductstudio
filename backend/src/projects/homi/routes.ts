import { Router } from 'express'

import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js'
import { attachSupabaseUser } from '../../middleware/attachSupabaseUser.js'
import { normalizeAddressKey } from './addressKey.js'
import { lookupProperty } from './lookup.js'
import { getProviders } from './providers/registry.js'

export const homiRouter = Router()

type LookupBody = {
  street?: unknown
  city?: unknown
  state?: unknown
  zip?: unknown
}

function validateAddress(body: LookupBody): { ok: true; addr: { street: string; city: string; state: string; zip: string } } | { ok: false; error: string } {
  const street = typeof body.street === 'string' ? body.street.trim() : ''
  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const state = typeof body.state === 'string' ? body.state.trim().toUpperCase() : ''
  const zip = typeof body.zip === 'string' ? body.zip.trim() : ''
  if (!street) return { ok: false, error: 'street is required' }
  if (!city) return { ok: false, error: 'city is required' }
  if (!/^[A-Z]{2}$/.test(state)) return { ok: false, error: 'state must be a 2-letter code' }
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return { ok: false, error: 'zip must be 5 or 9 digits' }
  return { ok: true, addr: { street, city, state, zip } }
}

homiRouter.post('/lookup', attachSupabaseUser, async (req, res) => {
  const validation = validateAddress(req.body as LookupBody)
  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

  const userId = req.supabaseUser?.id
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    res.status(503).json({ error: 'Server data store is not configured' })
    return
  }

  try {
    const results = await lookupProperty(validation.addr)
    const addressKey = normalizeAddressKey(validation.addr)
    const providersUsed = getProviders()
      .filter((p) => p.enabled)
      .map((p) => p.name)

    const { data: search, error: searchErr } = await supabase
      .from('homi_searches')
      .insert({
        user_id: userId,
        street: validation.addr.street,
        city: validation.addr.city,
        state: validation.addr.state,
        zip: validation.addr.zip,
        address_key: addressKey,
        providers_used: providersUsed,
      })
      .select('id')
      .single()

    if (searchErr || !search) {
      res.status(500).json({ error: searchErr?.message ?? 'Failed to record search' })
      return
    }

    res.json({ searchId: (search as { id: string }).id, results })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' })
  }
})

homiRouter.get('/searches', attachSupabaseUser, async (req, res) => {
  const userId = req.supabaseUser?.id
  const supabase = getSupabaseAdmin()
  if (!userId || !supabase) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const { data, error } = await supabase
      .from('homi_searches')
      .select('id, street, city, state, zip, providers_used, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ searches: data ?? [] })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' })
  }
})
