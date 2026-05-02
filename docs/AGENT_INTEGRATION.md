# Agent Integration

## Scope

UtopiaOS treats OpenClaw as an external agent runtime for the `research_lead` job. The API owns auth, ownership, persistence, validation, and failure visibility. OpenClaw only owns execution of the research prompt and emission of JSON to stdout.

## Required Environment

- `OPENCLAW_COMMAND` optional
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEB_ORIGIN`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

When `OPENCLAW_COMMAND` is unset, UtopiaOS runs in explicit `mock` mode. When it is set, UtopiaOS runs in `openclaw-cli` mode and does not silently fall back to mock if the command fails.

## Contract

`OPENCLAW_COMMAND` must:

- read the full prompt from stdin
- write strict JSON to stdout
- exit `0` on success
- write any diagnostics or failure detail to stderr

The command output must match the shared `researchLeadResultSchema` in [`packages/schemas/src/index.ts`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/schemas/src/index.ts).

Expected format: `research_lead_json`

Required keys:

- `overview`
- `companySnapshot`
- `icpFit`
- `buyingSignals`
- `opportunities`
- `recommendedOffer`
- `nextAction`
- `riskFlags`
- `confidence`
- `sources`

## Runtime Wrapper

All OpenClaw execution now runs through `executeOpenClawResearchJob()` in [`packages/agent-actions/src/index.ts`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/agent-actions/src/index.ts).

The wrapper is responsible for:

- building the prompt from the lead
- executing `OPENCLAW_COMMAND`
- capturing stdout and stderr
- enforcing timeout
- parsing JSON
- schema-validating output
- returning a typed success or typed failure

No other part of the app should parse raw OpenClaw output.

## End-to-End Flow

1. User clicks `Run research`.
2. API verifies the Supabase user and loads the owner-scoped lead.
3. Repository marks the lead as `researching`.
4. Repository creates an `agent_run`.
5. `executeOpenClawResearchJob()` runs OpenClaw or mock mode.
6. On success, schema-validated research is persisted to the lead.
7. `agent_runs`, activity, and progression stats are updated.
8. On failure, the run is marked failed and the lead status is restored.
9. The frontend refetches leads, dashboard, and runtime status and shows the result.

## Failure Behavior

- Invalid JSON: the run fails, the lead is restored, and the UI receives a visible error.
- Schema validation failure: the run fails, the lead is restored, and the validation message is kept on the failed run.
- Non-zero exit: the run fails, the lead is restored, and stderr is included in the failure message when available.
- Timeout: the run fails, the lead is restored, and the timeout is reported.
- Missing OpenClaw command: UtopiaOS uses explicit `mock` mode.
- Configured OpenClaw command fails: UtopiaOS does not fall back to mock mode.

## Persistence

`agent_runs` persists:

- action
- mode
- status
- summary
- target type and target id
- prompt
- started and completed timestamps
- error

The Agents screen and `/api/system/status` surface runtime mode and the last observed run outcome.

## Diagnostics

`/api/system/status` now exposes:

- whether OpenClaw is configured
- current runtime mode
- command preview
- timeout
- expected output format
- last run status
- last run error
- schema validation status
- security note

## Future Direction

OpenClaw is currently integrated as a local CLI boundary. A future gateway/session-based runtime should preserve the same contract:

- authenticated owner on the Utopia side
- explicit job id and run status
- schema-validated output
- persisted diagnostics
- no silent fallback on configured runtime failure
