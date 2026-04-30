# Agent Rules

## Allowed by Default

- Read structured business context needed for a requested task.
- Draft research notes, opportunities, follow-ups, and next-action suggestions.
- Propose low-risk lead enrichment updates through validated backend actions.

## Requires Human Approval

- Sending emails or messages.
- Deleting records.
- Changing pricing or proposal value.
- Marking leads or deals won/lost.
- Publishing content or triggering external automations.

## Logging Requirements

- Log every agent run with input summary, status, and timestamps.
- Log proposed actions and whether they were auto-executed or held for approval.
- Log every executed change with actor, target entity, and resulting state.

