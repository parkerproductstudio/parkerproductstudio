import { Router } from 'express'

import { requireSupabaseUser } from '../../middleware/requireSupabaseUser.js'

export const homeServicesAppRouter = Router()

homeServicesAppRouter.get('/me', requireSupabaseUser, (req, res) => {
  const u = req.supabaseUser!
  res.json({
    user: { id: u.id, email: u.email },
    project: 'home-services-app',
  })
})
