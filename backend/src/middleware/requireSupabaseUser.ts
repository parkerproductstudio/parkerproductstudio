import type { RequestHandler } from 'express'

import { parseAllowedEmails } from '../lib/allowedEmails.js'
import { attachSupabaseUser } from './attachSupabaseUser.js'

const enforceAllowlist: RequestHandler = (req, res, next) => {
  const allowed = parseAllowedEmails()
  if (allowed.length === 0) {
    res.status(503).json({
      error: 'Project API is not configured (set ALLOWED_ADMIN_EMAILS)',
    })
    return
  }
  const email = req.supabaseUser?.email?.toLowerCase() ?? ''
  if (!allowed.includes(email)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

/** JWT + ALLOWED_ADMIN_EMAILS gate (503 if unset, 403 if email not listed). */
export const requireSupabaseUser: RequestHandler[] = [
  attachSupabaseUser,
  enforceAllowlist,
]
