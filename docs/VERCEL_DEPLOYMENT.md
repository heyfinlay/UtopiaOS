# Vercel Deployment

This repository is prepared for a single Vercel project:

- static Vite app built into root-level `dist`
- Hono API as a Vercel Node.js Function through [`api/[...path].ts`](/Users/finlaysturzaker/Documents/UtopiaOS/api/[...path].ts)
- `/api/*` routed to the API function
- `/health` routed to the API health endpoint
- all other routes routed to the React app shell

## Required Vercel Settings

Use the repository root as the Vercel project root.

Vercel should read these from `vercel.json`:

- Framework: `vite`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`

If lead creation returns `405 Method Not Allowed`, the frontend is usually being deployed without the root-level API function. Check:

- Root Directory is the repository root, not `apps/web`
- Output Directory is `dist`, not `public`
- Build Command is `pnpm build`
- `VITE_API_URL` is unset for a single-project deployment

## Environment Variables

Set these in Vercel:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Optional:

```bash
OPENCLAW_COMMAND=
VITE_SUPABASE_ANON_KEY=
```

Do not set `VITE_API_URL` unless the API is deployed separately.

## Supabase Migrations

Apply all migrations under [`supabase/migrations`](/Users/finlaysturzaker/Documents/UtopiaOS/supabase/migrations) before deploying. The API now fails startup if the required Supabase server env vars are missing.

## Verification

Run locally before deploy:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Then verify the deployment:

```bash
curl https://your-deployment-url.vercel.app/api/health
curl https://your-deployment-url.vercel.app/api/system/status
```
