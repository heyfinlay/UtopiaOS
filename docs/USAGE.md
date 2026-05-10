# Usage Guide

## Local Run

1. Run `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Set the required Supabase server and browser env vars.
4. Start the workspace with `pnpm dev`.
5. Open [http://localhost:5173](http://localhost:5173).

The API requires Supabase configuration. Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` causes startup to fail.

## Operator Workflow

### 1. Command Center

Use the Command screen to see:

- the current main quest
- mission progress
- featured lead
- recent agent runs
- XP progression
- recent activity

### 2. Create a lead

Open the lead dialog from the sidebar or the Leads screen and provide:

- contact name
- company
- website if known
- source
- priority
- context or pain points

After creation, the API stores the lead, awards XP, and writes an activity event.

### 3. Import leads from CSV

From the Leads screen, click `Import CSV` and choose a file with these columns:

- `name`
- `company`
- `website`
- `source`
- `priority`
- `notes`

Only `name` and `company` are required. The importer also accepts common aliases such as `contact`, `contact_name`, `business`, `url`, `channel`, `context`, and `pain_point`.

### 4. Research a lead

From the lead detail screen, click `Run research`.

The API will:

1. mark the lead as `researching`
2. create an `agent_run`
3. execute mock research or the configured external command
4. validate the JSON result
5. update the lead with research and next action
6. award XP
7. write activity logs

If `OPENCLAW_COMMAND` is configured and the command fails, the run is marked failed and the request returns an error. The API does not fall back to mock output in that case.

### 5. Review output

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

### 6. Check operational screens

- `Missions`: derived progression and activity
- `Clients`: promoted client records, audit notes, and delivery roadmap checkpoints
- `Vault`: persistent prompt and workflow templates with versioning
- `Agents`: runtime mode, command state, auth state, and approval decisions

## Runtime Checks

### API health

- [http://localhost:8787/health](http://localhost:8787/health)

### API runtime status

- [http://localhost:8787/api/system/status](http://localhost:8787/api/system/status)

Important fields:

- `repositoryMode`: always `supabase` for the public runtime contract
- `persistenceEnabled`: whether live persistence is active
- `agentMode`: `mock` or `openclaw-cli`
- `agentCommandConfigured`: whether `OPENCLAW_COMMAND` is set
- `currentRequestAuthenticated`: whether the request carried a valid Supabase access token

## Troubleshooting

### The API does not start

Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Startup now fails fast when either value is missing.

### The app shows the access gate and sign-in does not work

Check:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`
- Supabase Auth provider settings
- browser console and API logs for auth errors

### Lead research fails

Check:

- the API logs
- the Agents screen
- whether the external agent returned valid JSON
- whether the returned JSON matches the required schema
- whether `OPENCLAW_COMMAND` itself is exiting successfully


### 7. Run a lead-qualification mission

Call `POST /api/missions/lead-qualification` with:

```json
{ "leadId": "<lead-id>", "autoApprove": true }
```

Behavior:

1. Executes `research_lead` for the target lead.
2. Creates a `promote_client` approval.
3. If `autoApprove` is false or omitted, the mission blocks and waits for human approval.
4. If `autoApprove` is true, the approval is resolved and the lead is promoted to a client automatically.

Check mission run state with `GET /api/missions/runs`.
