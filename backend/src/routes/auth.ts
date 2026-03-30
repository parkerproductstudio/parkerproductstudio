import { Router } from 'express'

import { userHasProjectAccess } from '../lib/userProjectAccess.js'
import { attachSupabaseUser } from '../middleware/attachSupabaseUser.js'

export const authRouter = Router()

authRouter.get('/project-access', attachSupabaseUser, async (req, res) => {
  const user = req.supabaseUser!
  const projectAccess = await userHasProjectAccess(user.id)
  res.json({
    projectAccess,
    email: user.email ?? null,
  })
})
