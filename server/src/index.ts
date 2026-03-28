import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT) || 3001

const app = express()

if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173' }))
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

if (isProd) {
  const clientDist = path.join(__dirname, '../../frontend/dist')
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' })
    }
    next()
  })
  app.use(express.static(clientDist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next()
    }
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.listen(PORT, () => {
  console.log(
    `API ${isProd ? '(+ static)' : ''} listening on http://localhost:${PORT}`,
  )
})
