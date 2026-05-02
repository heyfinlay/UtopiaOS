# Vercel Deployment

This repository is prepared for a single Vercel project:

- static Vite app built into root-level `dist`
- Hono API as a Vercel Node.js Function through [`api/[...path].js`](/Users/finlaysturzaker/Documents/UtopiaOS/api/[...path].js)
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

## API Module Strategy

The Vercel catch-all function is [`api/[...path].js`](/Users/finlaysturzaker/Documents/UtopiaOS/api/[...path].js). The repository root declares `"type": "module"`, so this function is treated as ESM and can use Vercel's Web `Request`/`Response` handler shape directly.

The API application package, [`apps/api`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api), is also ESM and builds [`apps/api/dist/app.js`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api/dist/app.js) with `tsup --format esm`. The Vercel function dynamically imports that built module and caches the created Hono app promise across invocations.

Internal workspace packages must expose built `dist` files at runtime. Do not point `@utopia/*` package exports at `src/*.ts`; Vercel's serverless trace may include the built API app without copying package TypeScript source files, which causes `ERR_MODULE_NOT_FOUND` during function boot.

Do not statically import or CommonJS `require()` [`apps/api/src/app.js`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api/src/app.ts) from a Vercel function. Vercel may emit a CommonJS function wrapper for TypeScript entrypoints, and requiring the API package's ESM module causes `ERR_REQUIRE_ESM` before any route handler executes.

## Verification

Run locally before deploy:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:vercel-entrypoint
```

Then verify the deployment:

```bash
curl https://your-deployment-url.vercel.app/api/health
curl https://your-deployment-url.vercel.app/api/system/status
```
