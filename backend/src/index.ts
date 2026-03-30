import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'

import { homeServicesAppRouter } from './projects/home-services-app/index.js'
import { authRouter } from './routes/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Repo-root .env (same file Vite uses). Without this, local API has no SUPABASE_* vars.
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT) || 3001

/** SPA build folder; API-only deploys often omit this (e.g. separate Render static service). */
function resolveClientDist(): string | null {
  const override = process.env.CLIENT_DIST?.trim()
  if (override) {
    const abs = path.resolve(override)
    return fs.existsSync(abs) ? abs : null
  }
  const sibling = path.join(__dirname, '../../frontend/dist')
  return fs.existsSync(sibling) ? sibling : null
}

const app = express()

// Same pattern as BowlWise: single env var for the SPA origin(s). Default matches local Vite.
const rawFrontend =
  process.env.FRONTEND_URL?.trim() || 'http://localhost:5173'
const frontendOrigins = rawFrontend
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const corsOrigin: string | string[] =
  frontendOrigins.length === 0
    ? 'http://localhost:5173'
    : frontendOrigins.length === 1
      ? frontendOrigins[0]!
      : frontendOrigins

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

console.log(
  `[backend] CORS allowed origin(s): ${Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin}`,
)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

app.get('/api/meta', (_req, res) => {
  res.json({
    name: 'Parker Product Studio',
    tagline:
      'Principal product engineering for consumer and business applications—with AI agents when they are the right tool.',
  })
})

app.use('/api/auth', authRouter)
app.use('/api/projects/home-services-app', homeServicesAppRouter)

let prodClientDist: string | null = null
if (isProd) {
  prodClientDist = resolveClientDist()
  if (prodClientDist) {
    const dist = prodClientDist
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' })
      }
      next()
    })
    app.use(express.static(dist))
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next()
      }
      res.sendFile(path.join(dist, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  } else {
    console.warn(
      '[backend] No SPA build found (frontend/dist or CLIENT_DIST). Running API only.',
    )
  }
}

app.listen(PORT, () => {
  const mode = !isProd ? '' : prodClientDist ? '(+ static)' : '(API only)'
  console.log(`API ${mode} listening on http://localhost:${PORT}`)
})
