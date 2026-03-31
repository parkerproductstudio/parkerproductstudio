# Parker Product Studio

Monorepo: **Vite + React** (`frontend/`), **Express** (`backend/`), optional **Supabase** (Auth + Postgres for side projects).

## Scripts

- `npm install` — install dependencies
- `npm run dev` — run frontend and backend in development
- `npm run build` — production build
- `npm start` — run the production backend (serves API + static `frontend/dist`)

## Environment variables

Copy `.env.example` to **`.env` in the repository root**. Vite is configured with `envDir` pointing at the root so `VITE_*` variables load for local dev. The **Express** app loads that same file via **`dotenv`** on startup so `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available for `/api/auth/*` and project routes—without this, the SPA can be signed in while the Projects link never appears (API returns errors or `projectAccess: false`).

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon (public) key |
| `SUPABASE_URL` | Server | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key (never expose to browser) |
| `VITE_API_BASE_URL` | Frontend (build) | Optional. Full origin of the Express API **with no trailing slash** when the SPA is on a different host (e.g. `https://your-api.onrender.com`). Omit for same-origin deploys. |
| `FRONTEND_URL` | Server | SPA origin(s) for **CORS** (same idea as BowlWise). Defaults to `http://localhost:5173`. For split static + API, set to your static site URL; comma-separate if you need `www` and apex. |
| `VITE_DEV_PROXY_TARGET` | Frontend (Vite dev only) | Optional. Where Vite should proxy `/api` (default `http://127.0.0.1:3001`). Change if the backend uses another port. |
| `ANTHROPIC_API_KEY` | Server | Required for **Home Services embed** chat (`/api/public/home-services/*`). Never expose to the browser. |
| `ANTHROPIC_MODEL` | Server | Optional. Defaults to **`claude-sonnet-4-20250514`** (Sonnet 4). Override if your account uses another snapshot, e.g. **`claude-sonnet-4-6`**. |
| `VITE_HOME_SERVICES_EMBED_KEY` | Frontend (build) | Optional for local preview of `/embed/home-services/…`. Must match `home_services_companies.embed_public_key` for that tenant. You can use `?embedKey=` on the URL instead for quick tests. |

### Local dev: `GET /api/auth/project-access` → 404

Usually the browser is not talking to **this** repo’s API:

1. **Backend not running** or **wrong port** — run `npm run dev` from the repo root (starts both). Check the terminal for `listening on http://localhost:3001` (or your `PORT`). Try `curl http://127.0.0.1:3001/api/health`.
2. **Port 3001 used by another app** — another process can answer with a different 404. Free the port or set **`PORT=3002`** on the backend and **`VITE_DEV_PROXY_TARGET=http://127.0.0.1:3002`** in `.env`.
3. **`localhost` / IPv6** — Vite proxies to **`127.0.0.1:3001`** by default to avoid `localhost` → `::1` mismatches.
4. **`VITE_API_BASE_URL` in `.env`** — if set while developing, the browser calls that host instead of the Vite proxy. Remove it for local work, or point it at a server that actually implements `/api/auth/project-access`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers**: enable Email. For **public sign-up** (this app has `/signup`), leave sign-ups enabled. Any **signed-in** user can open **`/projects`**; individual project cards may be **everyone** vs **admins only**. **`user_profiles.admin`** still gates **`/api/auth/project-access`**, the internal **Home Services — studio** page, and **`/api/projects/*`** routes that use **`requireSupabaseUser`**. New users get a profile with `admin = false` automatically.
3. **Authentication → URL Configuration**
   - **Site URL**: your production origin, e.g. `https://parkerproductstudio.com`
   - **Redirect URLs**: add at least:
     - `https://parkerproductstudio.com/**`
     - `https://www.parkerproductstudio.com/**` (if you use `www`)
     - `https://<your-app>.onrender.com/**` (if applicable)
     - `http://localhost:5173/**` (local Vite)
     - `http://localhost:5173/auth/callback` and `https://parkerproductstudio.com/auth/callback` (explicit callback path; wildcards often cover these)
     - Same host paths **`/auth/confirm`** if you customize email templates to use `token_hash` (see [Supabase PKCE email docs](https://supabase.com/docs/guides/auth/passwords#pkce-flow)).
   The browser client uses the **implicit** session flow so **email confirmation links work even if the user opens the email on another device** (forced PKCE breaks that because the `code_verifier` lives in the browser that started sign-up). Links may return **`?code=`** (still exchanged when present) or **`#access_token=…`** in the URL; **`AuthProvider`** finishes the session and routes you to **`/projects`** or **`/auth/update-password`** after recovery. If the link sits in your inbox too long, Supabase may return `#error=…&error_code=otp_expired`—the **Sign in** page explains that and offers **Send reset link**.
4. **SQL Editor**: run migrations in order:
   - `supabase/migrations/001_home_services_app.sql` — notes table and RLS.
   - `supabase/migrations/002_user_profiles.sql` — `user_profiles` with `admin`, trigger for new sign-ups, backfill for existing users, and a seed that sets **`admin = true`** for `eric.jason.parker@gmail.com` if that auth user exists. **Add more admins** with:
     ```sql
     update public.user_profiles p
     set admin = true, updated_at = now()
     from auth.users u
     where p.id = u.id and lower(u.email) = lower('other@example.com');
     ```
     Or edit the row in **Table Editor** (uses service role).
   - `supabase/migrations/003_home_services_embed_multitenant.sql` — companies (tenant), intake sessions, messages, private Storage bucket **`home-services-embed`**, and seed **Parker Electric** (`slug` `parker-electric`). The seed uses a **known demo** `embed_public_key`; **rotate it in production** (`update public.home_services_companies …`) and add each site’s origin to **`allowed_origins`** (browser `Origin` for requests from your hosted embed page or a customer’s site if you load the widget there).
   - `supabase/migrations/004_home_services_session_contact.sql` — optional customer **name, phone, email, address** and **`contact_collected_at`** on **`home_services_sessions`** (filled by the embed API from the chat).
5. Copy **Project URL** and keys from **Settings → API** into `.env`.

### Users and passwords

- **New user with a password**: **Authentication → Users → Add user** — enter email and password, enable **Auto Confirm User** (wording may vary) so they can sign in immediately.
- **Existing user**: open the user in **Users** → use **Send password recovery** (or **Reset password**) so they get an email; after the URL fix above, the link should complete in the app. There is often **no** “type a new password in the dashboard” field for security reasons; recovery email or delete-and-recreate the user are the usual options.

## Deploy on Render (single Web Service)

Use a **Web Service** (not a separate static site) so Express serves both the API and the SPA.

- **Root directory**: repository root (empty) or leave default.
- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`
- **Environment**: set the same variables as in `.env` (including all `VITE_*` vars so the **build** embeds them in the client bundle). **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** must be set on the server for **`/api/auth/project-access`**, admin-only UI, and embed APIs; without them, sign-in may work in the browser while admin checks or APIs fail.

After deploy, add your custom domain under the service **Settings → Custom Domains**.

### Split static “Web” + API Web Service on Render

**API service**

- **Root directory:** repository root (recommended) or `backend` if you adjust install/build.
- **Build command:** `npm install && npm run build -w backend`
- **Start command:** `npm run start -w backend`
- **Environment:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and **`FRONTEND_URL`** = your **static site origin** (no path), e.g. `https://parkerproductstudio.onrender.com` — same pattern as BowlWise. Use a comma-separated list if you serve the SPA from both apex and `www`. The API logs allowed CORS origin(s) on startup.

**Static / Web service** (Render Static Site or Web Service serving `frontend/dist`)

- **Build command:** `npm install && npm run build -w frontend` (from repo root), or `cd frontend && npm install && npm run build` if root is `frontend` only.
- **Publish directory:** `frontend/dist`
- **Environment (build-time):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and **`VITE_API_BASE_URL`** = your API origin with **no trailing slash**, e.g. `https://parkerproductstudio-api.onrender.com`

**Supabase → URL configuration:** **Site URL** and **Redirect URLs** must use the **static site** origin (where users open the app), not the API host.

**Unified alternative:** One Web Service from the repo root with `npm install && npm run build` and `npm start` — leave **`VITE_API_BASE_URL`** unset. Same-origin browser requests usually do not need CORS; you can still set **`FRONTEND_URL`** to your public site URL if you want the allowlist to match production.

**API-only note:** If `frontend/dist` is missing next to the API, Express runs **API only** (no ENOENT). Split deploy is the intended use case for that layout.

**Custom SPA path on the API box:** set **`CLIENT_DIST`** to an absolute path if you copy `frontend/dist` there.

### Migrating from a Render Static Site

Point the domain at the new Web Service instead of the static site, or delete the static service once the Web Service is verified.

## Project layout

- `frontend/src/pages/` — marketing shell, login, projects hub.
- `frontend/src/projects/home-services-app/` — first side project UI.
- `backend/src/projects/home-services-app/` — Authenticated routes under `/api/projects/home-services-app/` and **public embed** JSON under `/api/public/home-services/` (embed key + optional origin allowlist per company).
- `supabase/migrations/` — SQL to run in Supabase.

## Routes

| Path | Access |
|------|--------|
| `/` | Public landing |
| `/login` | Sign in (email + password; forgot password on the same page) |
| `/signup` | Public sign up (email confirmation follows your Supabase settings) |
| `/auth/callback`, `/auth/confirm` | Finish email links (implicit / PKCE / `token_hash`); no manual UI |
| `/projects` | **Signed in** — project list (guests are redirected to **Sign in**). |
| `/embed/home-services/:companySlug` | **Public** — intake widget (no sign-in). **`X-Embed-Key`** / **`?embedKey=`**; reflecting CORS for tenant origins. Signed-in users see **← Projects**. |
| `/demo/parker-electric` | **Public** — short alias → same as `/embed/home-services/parker-electric` (query string preserved, e.g. **`?embedKey=`**). |
| `/projects/home-services-app` | **Admins only** — internal Home Services studio page (not linked from the hub; direct URL). |
