import { Router } from 'express'

import { emailHasProjectAccess } from '../lib/allowedEmails.js'
import { attachSupabaseUser } from '../middleware/attachSupabaseUser.js'

export const authRouter = Router()

authRouter.get('/project-access', attachSupabaseUser, (req, res) => {
  const user = req.supabaseUser!
  res.json({
    projectAccess: emailHasProjectAccess(user.email),
    email: user.email ?? null,
  })
})
