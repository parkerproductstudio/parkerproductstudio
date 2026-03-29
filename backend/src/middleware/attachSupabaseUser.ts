import type { RequestHandler } from 'express'

import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'

/** Validates Bearer JWT and sets `req.supabaseUser`. Does not enforce allowlist. */
export const attachSupabaseUser: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' })
    return
  }
  const token = header.slice(7).trim()
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' })
    return
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    res.status(503).json({ error: 'Server auth is not configured' })
    return
  }

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  req.supabaseUser = user
  next()
}
