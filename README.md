# Utopia Command

Utopia Command is a monorepo for a tactical business operating system built around:

- a React command center in [`apps/web`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/web)
- a Hono API in [`apps/api`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api)
- shared schemas in [`packages/schemas`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/schemas)
- a Supabase-backed repository layer in [`packages/db`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/db)
- an agent execution bridge in [`packages/agent-actions`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/agent-actions)

The current product slice covers lead capture, structured lead research, activity logging, XP progression, approvals, runtime visibility, and agent safety controls.

The current architecture is organized around explicit product domains:

- Identity
- Leads / CRM
- Clients
- Agent Runs
- OpenClaw Runtime
- Approvals
- Activity / Audit
- Progression / XP
- Templates / Vault
- Dashboard

## What Works

- Command center dashboard with live mission, pipeline, activity, and stat views
- Lead board with search, priority filtering, lead detail, create, edit, and bulk import flows
- `research_lead` action with strict schema validation
- Agents screen showing persistence state, auth state, command status, and approvals
- Missions, clients, and vault views backed by the API
- Supabase-backed persistence for leads, activities, agent runs, approvals, clients, templates, and progression
- Mock research when no external agent command is configured

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Set the required server and browser Supabase variables in `.env`.

4. Start the app:

```bash
pnpm dev
```

5. Open:

- Web: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:8787/health](http://localhost:8787/health)

The API now requires valid Supabase configuration at startup. If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, startup fails immediately.

## Runtime Model

### Persistence

The API always runs against Supabase in production-style operation. Required server variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Request ownership is resolved from the authenticated Supabase user id. `UTOPIA_OWNER_ID` is no longer part of the runtime routing model.

### Agent execution

Research runs in one of two modes:

- `mock` when `OPENCLAW_COMMAND` is not configured
- `openclaw-cli` when `OPENCLAW_COMMAND` is configured and returns valid JSON

If `OPENCLAW_COMMAND` is configured and fails, the run is marked failed. The API no longer falls back to mock output after command failure.

## Environment

See [`.env.example`](/Users/finlaysturzaker/Documents/UtopiaOS/.env.example).

Required variables:

- `VITE_API_URL`: web app API base URL
- `PORT`: API port
- `WEB_ORIGIN`: allowed web origin(s) for CORS
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service role key used by the API
- `VITE_SUPABASE_URL`: browser Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`: browser auth key
- `OPENCLAW_COMMAND`: optional external research command

## Supabase Setup

1. Create a Supabase project.
2. Apply all migrations under [`supabase/migrations`](/Users/finlaysturzaker/Documents/UtopiaOS/supabase/migrations).
3. Enable the auth method you want to use for operators.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Set `VITE_SUPABASE_URL` and a browser publishable or anon key.
6. Start the API and sign in through the web app.

You can confirm runtime state in the Agents screen or through [`/api/system/status`](http://localhost:8787/api/system/status).

## Agent Integration

The agent contract is documented in [docs/AGENT_INTEGRATION.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/AGENT_INTEGRATION.md).

In short:

- the API builds a research prompt from the lead
- the prompt is piped into `OPENCLAW_COMMAND` when configured
- stdout must be valid JSON
- the JSON is schema-validated before persistence
- configured command failures produce failed agent runs instead of mock fallback
- lead status is restored when research fails

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Vercel Deployment

The repository includes [`vercel.json`](/Users/finlaysturzaker/Documents/UtopiaOS/vercel.json) for a single-project Vercel deployment. The Vite app is served from `apps/web/dist`, and the Hono API runs as a Vercel Node.js Function via [`api/[...path].ts`](/Users/finlaysturzaker/Documents/UtopiaOS/api/[...path].ts).

See [`docs/VERCEL_DEPLOYMENT.md`](/Users/finlaysturzaker/Documents/UtopiaOS/docs/VERCEL_DEPLOYMENT.md) for deployment details.

## Documentation

- Architecture: [docs/TECHNICAL_ARCHITECTURE.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/TECHNICAL_ARCHITECTURE.md)
- Usage: [docs/USAGE.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/USAGE.md)
- Vercel deployment: [docs/VERCEL_DEPLOYMENT.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/VERCEL_DEPLOYMENT.md)
- Auth setup: [AUTH_SETUP.md](/Users/finlaysturzaker/Documents/UtopiaOS/AUTH_SETUP.md)
- Agent integration: [docs/AGENT_INTEGRATION.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/AGENT_INTEGRATION.md)
- Invariants: [docs/UTOPIA_OS_INVARIANTS.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/UTOPIA_OS_INVARIANTS.md)
