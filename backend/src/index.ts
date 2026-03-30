import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'

import { homeServicesAppRouter } from './projects/home-services-app/index.js'
import { authRouter } from './routes/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
app.use(express.json())

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173' }))
} else {
  const allowed = parseCorsOrigins()
  if (allowed.length > 0) {
    app.use(
      cors({
        origin(origin, callback) {
          if (origin === undefined || allowed.includes(origin)) {
            callback(null, true)
            return
          }
          callback(null, false)
        },
      }),
    )
    console.log(
      `[backend] CORS enabled for ${allowed.length} origin(s): ${allowed.join(', ')}`,
    )
  }
}

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
