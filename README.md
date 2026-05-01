# Utopia Command

Utopia Command is a monorepo for a tactical business operating system. It combines:

- a React command center in [`apps/web`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/web)
- a Hono API in [`apps/api`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api)
- shared domain schemas in [`packages/schemas`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/schemas)
- a repository layer with in-memory and Supabase modes in [`packages/db`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/db)
- an agent action bridge in [`packages/agent-actions`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/agent-actions)

The current product slice covers lead capture, structured lead research, activity logging, XP progression, runtime status visibility, and agent-safety guardrails.

## What Works

- Command center dashboard with live mission, pipeline, activity, and stat views
- Lead board with search, priority filtering, lead detail, and create-lead flow
- `research_lead` action with validated structured output
- Agent control screen showing runtime mode, persistence mode, and recent runs
- Mission board, client readiness view, and prompt/safety vault
- In-memory fallback for instant local use
- Supabase-backed persistence when full environment configuration is present

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Start the app:

```bash
pnpm dev
```

4. Open:

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:8787/health](http://localhost:8787/health)

Without any extra configuration, the API runs in `memory` mode and the agent bridge runs in `mock` mode. That makes the full product usable locally without external services.

## Runtime Modes

### Default local mode

- `packages/db` uses the in-memory repository
- `packages/agent-actions` returns validated mock research
- no external services are required

### Supabase persistence mode

The API switches to Supabase automatically when all of these are set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UTOPIA_OWNER_ID`

If any of those are missing, the API stays in in-memory mode.

### Live agent mode

The research action switches from mock execution to external command execution when:

- `OPENCLAW_COMMAND` is set

The command is executed by piping the prompt to stdin. The command must return strict JSON that matches the research schema.

## Environment

See [`.env.example`](/Users/finlaysturzaker/Documents/UtopiaOS/.env.example).

Important variables:

- `VITE_API_URL`: web app API base URL
- `PORT`: API port
- `WEB_ORIGIN`: allowed web origin(s) for CORS
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service role key used by the API
- `UTOPIA_OWNER_ID`: owner record used for persisted rows
- `OPENCLAW_COMMAND`: command used to execute the agent

## Supabase Setup

1. Create a Supabase project.
2. Apply the migration in [`supabase/migrations/20260430191500_utopia_command_init.sql`](/Users/finlaysturzaker/Documents/UtopiaOS/supabase/migrations/20260430191500_utopia_command_init.sql).
3. Create a user in Supabase Auth.
4. Copy that user's UUID into `UTOPIA_OWNER_ID`.
5. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
6. Restart the API.

You can confirm the switch in the app under the Agents screen or via [`/api/system/status`](http://localhost:8787/api/system/status).

## Agent Integration

The agent contract is documented in [docs/AGENT_INTEGRATION.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/AGENT_INTEGRATION.md).

In short:

- the API builds a research prompt from the lead
- the prompt is piped into `OPENCLAW_COMMAND`
- stdout must be valid JSON
- the JSON is schema-validated before any persistence happens
- failures fall back to mock research and are logged on the agent run

## How To Use The App

See [docs/USAGE.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/USAGE.md).

The normal operator flow is:

1. Create a lead.
2. Open the lead file.
3. Run research.
4. Review the opportunity map, next action, and risk flags.
5. Check the Missions and Agents screens for progression and runtime state.
6. Use the Clients screen to review delivery-ready accounts.

## Repository Layout

```text
apps/
  api/        Hono backend
  web/        React frontend
packages/
  agent-actions/  external agent bridge
  db/             repository and persistence layer
  schemas/        shared Zod contracts
docs/
  AGENT_INTEGRATION.md
  AGENT_RULES.md
  PROGRESS.md
  TECHNICAL_ARCHITECTURE.md
  USAGE.md
```

## Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

## Vercel Deployment

The repository includes [`vercel.json`](/Users/finlaysturzaker/Documents/UtopiaOS/vercel.json) for a
single-project Vercel deployment. The Vite app is served from `apps/web/dist`, and the Hono API runs
as a Vercel Node.js Function via [`api/[...path].ts`](/Users/finlaysturzaker/Documents/UtopiaOS/api/[...path].ts).

See [`docs/VERCEL_DEPLOYMENT.md`](/Users/finlaysturzaker/Documents/UtopiaOS/docs/VERCEL_DEPLOYMENT.md)
for environment variables and deployment commands.

## Documentation

- Architecture: [docs/TECHNICAL_ARCHITECTURE.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/TECHNICAL_ARCHITECTURE.md)
- Usage: [docs/USAGE.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/USAGE.md)
- Vercel deployment: [docs/VERCEL_DEPLOYMENT.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/VERCEL_DEPLOYMENT.md)
- Agent integration: [docs/AGENT_INTEGRATION.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/AGENT_INTEGRATION.md)
- Agent rules: [docs/AGENT_RULES.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/AGENT_RULES.md)
- Progress log: [docs/PROGRESS.md](/Users/finlaysturzaker/Documents/UtopiaOS/docs/PROGRESS.md)
- Plan: [PLAN.md](/Users/finlaysturzaker/Documents/UtopiaOS/PLAN.md)
