import { Router } from 'express'

import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js'
import { requireSupabaseUser } from '../../middleware/requireSupabaseUser.js'

export const homeServicesAppRouter = Router()

homeServicesAppRouter.get('/me', ...requireSupabaseUser, (req, res) => {
  const u = req.supabaseUser!
  res.json({
    user: { id: u.id, email: u.email },
    project: 'home-services-app',
  })
})

homeServicesAppRouter.get('/sessions', ...requireSupabaseUser, async (req, res) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    res.status(503).json({ error: 'Server data store is not configured' })
    return
  }
  const rawSlug = req.query.companySlug
  const companySlug =
    typeof rawSlug === 'string' && rawSlug.trim()
      ? rawSlug.trim()
      : 'parker-electric'

  const { data: company, error: cErr } = await supabase
    .from('home_services_companies')
    .select('id, slug, name')
    .eq('slug', companySlug)
    .maybeSingle()
  if (cErr) {
    res.status(500).json({ error: cErr.message })
    return
  }
  if (!company) {
    res.status(404).json({ error: 'Company not found' })
    return
  }

  const { data: rows, error: sErr } = await supabase
    .from('home_services_sessions')
    .select(
      'id, created_at, updated_at, status, customer_name, customer_phone, customer_email, customer_address, job_summary, supplies',
    )
    .eq('company_id', company.id as string)
    .order('created_at', { ascending: false })
  if (sErr) {
    res.status(500).json({ error: sErr.message })
    return
  }

  const sessions = (rows ?? []).map((row) => {
    const suppliesRaw = (row as { supplies?: unknown }).supplies
    const supplies = Array.isArray(suppliesRaw)
      ? suppliesRaw.filter((x): x is string => typeof x === 'string')
      : []
    return {
      ...(row as object),
      supplies,
    }
  })

  res.json({
    company: { slug: company.slug, name: company.name },
    sessions,
  })
})
