# Usage Guide

## Local Run

1. Run `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Start the workspace with `pnpm dev`.
4. Open [http://localhost:5173](http://localhost:5173).

If Supabase and agent settings are not present, the app still works in `memory` + `mock` mode.

## Operator Workflow

### 1. Command Center

Use the Command screen to see:

- the current main quest
- mission progress
- featured lead
- recent agent runs
- XP progression
- recent activity

### 2. Create A Lead

Open the lead dialog from the sidebar or the Leads screen and provide:

- contact name
- company
- website if known
- source
- priority
- context or pain points

After creation, the API:

- stores the lead
- awards lead-creation XP
- writes an activity event

### 3. Import Leads From CSV

From the Leads screen, click `Import CSV` and choose a file with these columns:

- `name`
- `company`
- `website`
- `source`
- `priority`
- `notes`

Only `name` and `company` are required. The importer also accepts common aliases such as
`contact`, `contact_name`, `business`, `url`, `channel`, `context`, and `pain_point`.
`priority` must be `normal`, `high`, or `critical`.

The app previews valid rows before import. If a row is invalid, the dialog shows the row number and
field issue before anything is sent to the API.

### 4. Research A Lead

From the lead detail screen, click `Run research`.

The API will:

1. mark the lead as `researching`
2. create an `agent_run`
3. execute `research_lead`
4. validate the JSON result
5. update the lead with research and next action
6. award XP
7. write activity logs

### 5. Review Output

Each researched lead includes:

- overview
- company snapshot
- ICP fit
- buying signals
- opportunity map
- recommended offer
- next action
- risk flags
- sources

### 6. Check Operational Screens

- `Missions`: derived progression and activity
- `Clients`: researched accounts that are moving toward delivery
- `Vault`: stable prompt and safety artifacts
- `Agents`: runtime mode, connection state, and recent runs

## Runtime Checks

### API health

- [http://localhost:8787/health](http://localhost:8787/health)

### API runtime status

- [http://localhost:8787/api/system/status](http://localhost:8787/api/system/status)

Important fields:

- `repositoryMode`: `memory` or `supabase`
- `persistenceEnabled`: whether live persistence is active
- `agentMode`: `mock` or `openclaw-cli`
- `agentCommandConfigured`: whether `OPENCLAW_COMMAND` is set

## Data Persistence

### In-memory mode

- fastest local iteration
- resets on API restart
- requires no external services

### Supabase mode

- persists leads, activities, agent runs, and progression
- requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `UTOPIA_OWNER_ID`
- is selected automatically by the API when fully configured

## Troubleshooting

### The app runs but data resets

The API is still in `memory` mode. Check `UTOPIA_OWNER_ID`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.

### Research always returns mock data

`OPENCLAW_COMMAND` is not configured, or the configured command failed and the action fell back to mock mode.

### Lead research fails

Check:

- the API logs
- the Agents screen
- whether the external agent returned valid JSON
- whether the returned JSON matches the required schema
