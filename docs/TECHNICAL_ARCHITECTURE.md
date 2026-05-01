# Technical Architecture

## Workspace Topology

- [`apps/web`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/web): React operator dashboard
- [`apps/api`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api): Hono API for validated reads and mutations
- [`packages/schemas`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/schemas): shared Zod contracts and domain types
- [`packages/db`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/db): repository layer with Supabase production runtime and in-memory test doubles
- [`packages/agent-actions`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/agent-actions): external agent bridge plus mock research mode when no command is configured

## Core Runtime Flow

### Lead creation

1. The web app posts `createLeadInputSchema` data to `POST /api/leads`.
2. The API authenticates the request and resolves the Supabase user id.
3. The repository writes the lead in Supabase for that owner.
4. The API awards XP and writes an activity record.
5. The web app invalidates dashboard and lead queries.

### Lead research

1. The web app posts `POST /api/leads/:leadId/research`.
2. The API loads the lead and marks it `researching`.
3. The API creates an `agent_run` record.
4. `packages/agent-actions` builds the prompt.
5. If `OPENCLAW_COMMAND` is configured, the prompt is piped to the external command. Otherwise the mock research generator is used.
6. The returned JSON is validated against the shared schema.
7. The repository writes the research result, activity event, and updated progression stats.
8. If the command fails, the run is marked failed and no fallback result is persisted.

## Persistence Strategy

The runtime API is Supabase-only:

- `createConfiguredUtopiaRepository()` fails fast when required Supabase env vars are missing
- request ownership is resolved from the authenticated Supabase user id
- public API contracts no longer advertise memory persistence as a supported runtime mode

The in-memory repository remains available for targeted tests and local doubles where explicit wiring is useful.

## API Surface

- `GET /health`
- `GET /api/dashboard`
- `GET /api/leads`
- `GET /api/leads/:leadId`
- `POST /api/leads`
- `POST /api/leads/import`
- `PATCH /api/leads/:leadId`
- `POST /api/leads/:leadId/research`
- `POST /api/leads/:leadId/promote`
- `GET /api/system/status`

`/api/system/status` exists to make runtime truth visible to the UI and operators:

- repository mode
- whether Supabase is configured
- whether auth is required
- whether the current request is authenticated
- whether a live agent command is configured
- whether agent execution is `mock` or `openclaw-cli`

## Safety Model

- The repository is the source of truth for business state.
- Shared schemas define the trusted contract between web, API, persistence, and agent output.
- Agent output is untrusted until parsed and validated.
- Command execution failures are surfaced as failed runs, not silent fallbacks.
- Activity logs and agent runs provide an audit trail for each material action.
