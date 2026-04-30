# Agent Rules

## Allowed By Default

- Read structured lead context needed for a requested task
- Draft research notes, buying signals, opportunities, and recommended offers
- Propose low-risk enrichment updates through validated backend actions
- Suggest next actions that still require human judgment before any risky execution

## Requires Human Approval

- Sending emails, DMs, or any other outbound communication
- Deleting records
- Changing pricing, value, or commercial terms
- Marking leads or deals as won or lost
- Publishing content
- Triggering external automations with material side effects

## Required Logging

- Log every agent run with action, status, target, prompt, and timestamps
- Log the resulting lead or system activity after a successful run
- Preserve the run error when live agent execution fails
- Keep the database as the source of truth for resulting business state

## Validation Rules

- Agent output is not trusted until it passes the shared Zod schema
- Invalid JSON or schema failures do not write raw agent output into business fields
- The current research path can fall back to a mock result so the operator experience remains usable

## Current Action Surface

The current production action is:

- `research_lead`

It is intentionally low-risk. It enriches the lead, writes activity, and updates progression, but it does not perform outbound or destructive actions.

## Operator Expectation

The agent is an execution assistant inside a constrained rail, not an autonomous owner of business state. The human remains responsible for:

- deciding whether research is good enough to act on
- approving any risky step
- confirming pricing, outreach, and commercial outcomes
