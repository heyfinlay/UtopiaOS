# Technical Architecture

## MVP Topology

- `apps/web`: Vite + React + TypeScript operator dashboard.
- `apps/api`: Hono API bridge for validated mutations and agent actions.
- `packages/schemas`: shared Zod schemas and domain types.
- `packages/db`: database contracts, repository interfaces, and Supabase integration points.
- `packages/agent-actions`: OpenClaw-facing action orchestration and safety rules.

## Initial Vertical Slice

1. Create a lead from the dashboard.
2. Persist the lead through the backend repository layer.
3. Trigger `research_lead`.
4. Validate and save structured research output.
5. Log activity and award XP.

## Safety Model

- The database remains the source of truth for business state.
- Agent outputs are treated as untrusted until parsed and validated.
- High-risk actions require an approval state before execution.
- Every agent run and material write is logged with intent and result metadata.

