import type { RequestHandler } from 'express'

import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { userHasProjectAccess } from '../lib/userProjectAccess.js'
import { attachSupabaseUser } from './attachSupabaseUser.js'

const enforceProjectAdmin: RequestHandler = async (req, res, next) => {
  const svc = getSupabaseAdmin()
  if (!svc) {
    res.status(503).json({ error: 'Server auth is not configured' })
    return
  }
  const userId = req.supabaseUser?.id
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const allowed = await userHasProjectAccess(userId)
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

/** JWT + user_profiles.admin gate (403 if not admin). */
export const requireSupabaseUser: RequestHandler[] = [
  attachSupabaseUser,
  enforceProjectAdmin,
]
