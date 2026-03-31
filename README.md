# Parker Product Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232a?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-393939?logo=express&logoColor=white)](https://expressjs.com/)

**Product engineering studio site and reference app** — marketing pages, Supabase auth, a projects hub, and a **multi-tenant Home Services intake** flow: embeddable chat, **Claude**-driven follow-ups, optional photos, structured **contact capture** (name, phone, address, email), and per-company **embed keys** + origin allowlists.

**Live:** [parkerproductstudio.com](https://parkerproductstudio.com) · **Public demo (no sign-in):** [parkerproductstudio.com/demo/parker-electric](https://parkerproductstudio.com/demo/parker-electric)

---

## Highlights

- **Full-stack TypeScript** — Vite + React SPA, Express API, shared patterns for split or unified deploys (e.g. Render).
- **Auth & access** — Email/password via Supabase; signed-in **Projects** area; **admin** flag in Postgres for gated APIs and internal tools.
- **AI intake product** — Server-side **Anthropic** (Claude Sonnet family), vision-capable pipeline with image resize for API limits, conversation persistence, **sessionStorage** resume for anonymous embed users.
- **Multi-tenant embed** — Companies in Postgres, public JSON API under `/api/public/home-services`, signed URLs for chat images, CORS tuned for real customer sites.

---

## Tech stack

| Layer | Choices |
|--------|---------|
| Frontend | React, React Router, Vite |
| Backend | Express 5, `dotenv`, CORS |
| Data & auth | Supabase (Auth, Postgres, Storage) |
| AI | Anthropic Messages API (`ANTHROPIC_MODEL`, default Sonnet 4 snapshot) |
| Tooling | npm workspaces (`frontend`, `backend`) |

---

## Quick start

```bash
npm install
cp .env.example .env   # fill values (root .env — Vite + Express both read it)
npm run dev            # Vite :5173 + API :3001, /api proxied
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Frontend + backend in development |
| `npm run build` | Production build (both workspaces) |
| `npm start` | Production API; serves `frontend/dist` when present |

**Environment:** See **`.env.example`** for every variable and comment. Summary: Supabase URL + anon key (client) and service role (server); optional `VITE_API_BASE_URL` for split static + API; `FRONTEND_URL` for CORS; `ANTHROPIC_API_KEY` for embed chat; `VITE_HOME_SERVICES_EMBED_KEY` or `?embedKey=` for the widget.

---

## Supabase

1. Create a project, enable **Email** auth, set **Site URL** and **Redirect URLs** for production + `http://localhost:5173`.
2. Run SQL migrations **in order** in the SQL Editor:
   - `001_home_services_app.sql` — notes + RLS  
   - `002_user_profiles.sql` — admins, trigger, optional seed admin email  
   - `003_home_services_embed_multitenant.sql` — companies, sessions, messages, storage, Parker Electric seed (**rotate** demo `embed_public_key` in prod; set **`allowed_origins`**)  
   - `004_home_services_session_contact.sql` — customer contact columns on sessions  
3. Copy **Project URL** and keys from **Settings → API** into `.env`.

For email confirmation links, recovery flows, and adding admins via SQL, use [Supabase Auth docs](https://supabase.com/docs/guides/auth) and the comments in each migration file.

---

## Deploy (Render)

- **Single Web Service:** repo root, `npm install && npm run build`, `npm start` — same origin, usually leave `VITE_API_BASE_URL` unset.
- **Split static + API:** static build publishes `frontend/dist` (set **`VITE_API_BASE_URL`** on the static **build**); API service sets **`FRONTEND_URL`** to the static origin(s). Add a host **rewrite** `/* → /index.html` for SPA routes, or rely on **`frontend/public/_redirects`** where supported.

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/src/pages/` | Landing, auth, projects shell |
| `frontend/src/projects/home-services-app/` | Embed UI, internal studio page |
| `backend/src/projects/home-services-app/` | Project routes + **public embed** API |
| `supabase/migrations/` | Schema and seeds |

---

## Routes (cheat sheet)

| Path | Who |
|------|-----|
| `/` | Public marketing |
| `/login`, `/signup` | Auth |
| `/projects` | Signed-in users |
| `/embed/home-services/:slug`, `/demo/parker-electric` | **Public** intake (embed key + `allowed_origins` per company) |
| `/projects/home-services-app` | Admins only (direct URL) |

---

## Troubleshooting

**`GET /api/auth/project-access` → 404 locally** — Backend not running, wrong port, or `VITE_API_BASE_URL` pointing away from your dev API. Use `npm run dev` from repo root; confirm `curl http://127.0.0.1:3001/api/health`.

**Embed: “Origin not allowed”** — Add your static site origin to `home_services_companies.allowed_origins` for that tenant (exact `https://…` match), or use `{}` to rely on the embed key only.

---

*Principal product engineering for consumer and business applications — including **AI agents** when they’re the right tool.*
