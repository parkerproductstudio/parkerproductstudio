import type { RequestHandler } from 'express'

import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'

function parseAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_ADMIN_EMAILS?.trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export const requireSupabaseUser: RequestHandler = async (req, res, next) => {
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

  const allowed = parseAllowedEmails()
  if (allowed.length > 0) {
    const email = user.email?.toLowerCase() ?? ''
    if (!allowed.includes(email)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  }

  req.supabaseUser = user
  next()
}
