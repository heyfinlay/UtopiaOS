# Vercel Deployment

This repository is prepared for a single Vercel project:

- static Vite app from `apps/web/dist`
- Hono API as a Vercel Node.js Function through `api/[...path].ts`
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

The Vite config writes the web build to root-level `dist` so Vercel does not fall back to a
`public` output directory.

If lead creation returns `405 Method Not Allowed`, the frontend is usually being deployed without
the root-level `api/[...path].ts` function. Check these settings first:

- Root Directory must be the repository root, not `apps/web`.
- Output Directory must be `dist`, not `public`.
- Build Command must be `pnpm build`.
- `VITE_API_URL` should be unset for a single Vercel project so the app calls same-origin `/api/*`.

After deployment, verify the API function directly:

```bash
curl https://your-deployment-url.vercel.app/api/health
curl -X POST https://your-deployment-url.vercel.app/api/leads \
  -H 'content-type: application/json' \
  -d '{"name":"Test Lead","company":"Test Company","priority":"normal"}'
```

## Environment Variables

Set these in Vercel for durable persistence:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UTOPIA_OWNER_ID=
```

Do not set `VITE_API_URL` in Vercel unless the API is deployed separately. When it is unset, the
web app calls same-origin `/api/*`, which is the correct setting for this single-project deployment.

Optional:

```bash
OPENCLAW_COMMAND=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Supabase Migrations

Apply all migrations under `supabase/migrations` before using Supabase-backed production mode.
The API falls back to in-memory mode if the required Supabase variables are missing.

## Local Verification

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

If the Vercel CLI is linked:

```bash
vercel build
```

## Deploy

Preview:

```bash
vercel deploy
```

Production:

```bash
vercel deploy --prod
```
