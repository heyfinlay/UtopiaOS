# Technical Architecture

## Workspace Topology

- [`apps/web`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/web): React operator dashboard
- [`apps/api`](/Users/finlaysturzaker/Documents/UtopiaOS/apps/api): Hono API for validated mutations and reads
- [`packages/schemas`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/schemas): shared Zod contracts and domain types
- [`packages/db`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/db): repository abstraction with in-memory and Supabase implementations
- [`packages/agent-actions`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/agent-actions): external agent bridge and mock fallback logic

## Core Runtime Flow

### Lead creation

1. The web app posts `createLeadInputSchema` data to `POST /api/leads`.
2. The API creates the lead through the repository.
3. The repository writes the lead in either memory or Supabase.
4. The API awards XP and writes an activity record.
5. The web app invalidates dashboard and lead queries.

### Lead research

1. The web app posts `POST /api/leads/:leadId/research`.
2. The API loads the lead and marks it `researching`.
3. The API creates an `agent_run` record.
4. `packages/agent-actions` builds the prompt.
5. If `OPENCLAW_COMMAND` is configured, the prompt is piped to the external command.
6. The returned JSON is validated against the shared schema.
7. The repository writes the research result, activity event, and updated progression stats.
8. The API returns the updated lead, run, and stats.

## Repository Strategy

The repository layer is deliberately behind a single async contract so the API does not care whether storage is:

- ephemeral local state for fast development
- Supabase-backed persistence for real usage

### In-memory mode

- selected when full Supabase configuration is absent
- fastest startup and simplest local use
- resets on API restart

### Supabase mode

- selected only when `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `UTOPIA_OWNER_ID` are set
- uses the existing migration under [`supabase/migrations`](/Users/finlaysturzaker/Documents/UtopiaOS/supabase/migrations/20260430191500_utopia_command_init.sql)
- persists leads, activities, agent runs, and progression stats

## API Surface

- `GET /health`
- `GET /api/dashboard`
- `GET /api/leads`
- `GET /api/leads/:leadId`
- `POST /api/leads`
- `POST /api/leads/:leadId/research`
- `GET /api/system/status`

`/api/system/status` exists to make runtime truth visible to both the UI and the operator:

- repository mode
- whether Supabase is fully active
- whether an owner is configured
- whether a live agent command is configured
- whether agent execution is `mock` or `openclaw-cli`

## Safety Model

- The repository is the source of truth for business state.
- Shared schemas define the trusted contract between web, API, persistence, and agent output.
- Agent output is untrusted until parsed and validated.
- High-risk actions are explicitly separated from the current research loop.
- Activity logs and agent runs provide an audit trail for each material action.

## Frontend Composition

The web app is organized around operational surfaces rather than CRUD-only screens:

- `Command`: summary dashboard
- `Leads`: creation, research, and lead detail
- `Clients`: researched-account handoff visibility
- `Missions`: progression derived from logs
- `Vault`: stable prompt and workflow artifacts
- `Agents`: runtime visibility and integration state

## Testing

Current automated coverage includes:

- schema validation
- repository operations
- API end-to-end lead creation and research
- agent-action behavior
- dashboard grouping helpers
