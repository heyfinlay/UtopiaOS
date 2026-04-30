# Agent Integration

## Overview

The `research_lead` action is implemented in [`packages/agent-actions/src/index.ts`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/agent-actions/src/index.ts).

The flow is:

1. The API receives `POST /api/leads/:leadId/research`.
2. The repository marks the lead as `researching`.
3. The API creates an `agent_run`.
4. The agent action builds a prompt from the lead record.
5. If `OPENCLAW_COMMAND` is configured, the prompt is piped into that command.
6. Stdout is parsed as JSON and validated.
7. The validated result is written back to the lead and activity log.
8. If the command fails, the system falls back to mock research and records the error on the run.

## Required Command Behavior

Set:

```bash
OPENCLAW_COMMAND="your-command-here"
```

The command must:

- read the full prompt from stdin
- write strict JSON to stdout
- exit with status `0` on success

Stderr is captured and attached to the failed run path when execution fails.

## Expected JSON Shape

The payload must match the shared research schema in [`packages/schemas/src/index.ts`](/Users/finlaysturzaker/Documents/UtopiaOS/packages/schemas/src/index.ts).

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

Example shape:

```json
{
  "overview": "Short summary of why the lead is worth pursuing.",
  "companySnapshot": "Concise description of the company and current context.",
  "icpFit": "Why the account fits the target profile.",
  "buyingSignals": ["Signal one", "Signal two"],
  "opportunities": [
    {
      "title": "AI Efficiency Audit",
      "reason": "Why this offer angle fits.",
      "confidence": 82
    }
  ],
  "recommendedOffer": "Recommended starting offer.",
  "nextAction": "Lowest-risk next human action.",
  "riskFlags": ["Key uncertainty or caution."],
  "confidence": 80,
  "sources": ["Lead intake", "Website"]
}
```

## Suggested OpenClaw Wiring

If your agent CLI supports a JSON mode that reads from stdin, use that directly. For example:

```bash
OPENCLAW_COMMAND="openclaw run --json"
```

If your CLI needs a wrapper, point `OPENCLAW_COMMAND` at the wrapper script instead.

## Safety Properties

- The database is the source of truth.
- External agent output is not trusted until it passes schema validation.
- High-risk actions are not part of this execution path.
- Every run is logged with status and timestamps.

## How To Verify The Integration

1. Set `OPENCLAW_COMMAND`.
2. Restart the API.
3. Open the Agents screen or call [http://localhost:8787/api/system/status](http://localhost:8787/api/system/status).
4. Confirm:
   - `agentMode` is `openclaw-cli`
   - `agentCommandConfigured` is `true`
5. Create a lead and run research.
6. Confirm the run appears in the Agents screen.

If the command fails, the API will still return a valid response using the mock fallback, and the run will contain the error details.
