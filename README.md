# Parker Product Studio

Monorepo: **Vite + React** (`frontend/`), **Express** (`backend/`), optional **Supabase** (Auth + Postgres for side projects).

## Scripts

- `npm install` — install dependencies
- `npm run dev` — run frontend and backend in development
- `npm run build` — production build
- `npm start` — run the production backend (serves API + static `frontend/dist`)

## Environment variables

Copy `.env.example` to **`.env` in the repository root**. Vite is configured with `envDir` pointing at the root so `VITE_*` variables load for local dev.

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon (public) key |
| `SUPABASE_URL` | Server | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key (never expose to browser) |
| `ALLOWED_ADMIN_EMAILS` | Server | Comma-separated emails allowed into `/projects` and `/api/projects/*`. **Empty = nobody** (use this with public sign-up so random accounts stay blocked until you add them). |
| `VITE_API_BASE_URL` | Frontend (build) | Optional. Full origin of the Express API **with no trailing slash** when the SPA is on a different host (e.g. `https://your-api.onrender.com`). Omit for same-origin deploys. |
| `CORS_ORIGINS` | Server | Production only: comma-separated **exact** origins allowed to call the API (e.g. `https://your-site.onrender.com`). Required for split static + API. |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers**: enable Email. For **public sign-up** (this app has `/signup`), leave sign-ups enabled; only addresses in `ALLOWED_ADMIN_EMAILS` can open the private project areas. You can instead disable sign-ups and add users only via **Authentication → Users** if you prefer a closed directory.
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
4. **SQL Editor**: run `supabase/migrations/001_home_services_app.sql` to create `home_services_app_notes` and RLS policies.
5. Copy **Project URL** and keys from **Settings → API** into `.env`.

### Users and passwords

- **New user with a password**: **Authentication → Users → Add user** — enter email and password, enable **Auto Confirm User** (wording may vary) so they can sign in immediately.
- **Existing user**: open the user in **Users** → use **Send password recovery** (or **Reset password**) so they get an email; after the URL fix above, the link should complete in the app. There is often **no** “type a new password in the dashboard” field for security reasons; recovery email or delete-and-recreate the user are the usual options.

## Deploy on Render (single Web Service)

Use a **Web Service** (not a separate static site) so Express serves both the API and the SPA.

- **Root directory**: repository root (empty) or leave default.
- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`
- **Environment**: set the same variables as in `.env` (including all `VITE_*` vars so the **build** embeds them in the client bundle). **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** must be set here too—`/api/auth/project-access` runs on the server; without them, sign-in works in the browser but `/projects` shows “Could not verify access”.

After deploy, add your custom domain under the service **Settings → Custom Domains**.

### Split static “Web” + API Web Service on Render

**API service**

- **Root directory:** repository root (recommended) or `backend` if you adjust install/build.
- **Build command:** `npm install && npm run build -w backend`
- **Start command:** `npm run start -w backend`
- **Environment:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ADMIN_EMAILS`, and **`CORS_ORIGINS`** set to your **static site origin(s)** only (comma-separated, no path), e.g. `https://parkerproductstudio.onrender.com`. Include `www` separately if you use it. Logs will confirm CORS on boot.

**Static / Web service** (Render Static Site or Web Service serving `frontend/dist`)

- **Build command:** `npm install && npm run build -w frontend` (from repo root), or `cd frontend && npm install && npm run build` if root is `frontend` only.
- **Publish directory:** `frontend/dist`
- **Environment (build-time):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and **`VITE_API_BASE_URL`** = your API origin with **no trailing slash**, e.g. `https://parkerproductstudio-api.onrender.com`

**Supabase → URL configuration:** **Site URL** and **Redirect URLs** must use the **static site** origin (where users open the app), not the API host.

**Unified alternative:** One Web Service from the repo root with `npm install && npm run build` and `npm start` — leave **`VITE_API_BASE_URL`** unset and **`CORS_ORIGINS`** unset; the SPA is served from the same origin as `/api`.

**API-only note:** If `frontend/dist` is missing next to the API, Express runs **API only** (no ENOENT). Split deploy is the intended use case for that layout.

**Custom SPA path on the API box:** set **`CLIENT_DIST`** to an absolute path if you copy `frontend/dist` there.

### Migrating from a Render Static Site

Point the domain at the new Web Service instead of the static site, or delete the static service once the Web Service is verified.

## Project layout

- `frontend/src/pages/` — marketing shell, login, projects hub.
- `frontend/src/projects/home-services-app/` — first side project UI.
- `backend/src/projects/home-services-app/` — API routes under `/api/projects/home-services-app/`.
- `supabase/migrations/` — SQL to run in Supabase.

## Routes

| Path | Access |
|------|--------|
| `/` | Public landing |
| `/login` | Sign in (email + password; forgot password on the same page) |
| `/signup` | Public sign up (email confirmation follows your Supabase settings) |
| `/auth/callback`, `/auth/confirm` | Finish email links (implicit / PKCE / `token_hash`); no manual UI |
| `/projects` | Signed in **and** email allowlisted — project list |
| `/projects/home-services-app` | Authenticated — Home Services App experiment |
