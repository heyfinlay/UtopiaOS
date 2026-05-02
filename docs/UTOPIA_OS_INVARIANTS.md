# UtopiaOS Invariants

## 1. Scope

UtopiaOS is a Vite + React + Supabase business command centre with an authenticated API boundary and a local-first agent runtime boundary.

## 2. Product Domains

- Identity
- Leads / CRM
- Clients
- Agent Runs
- OpenClaw Runtime
- Approvals
- Activity / Audit
- Progression / XP
- Templates / Vault
- Dashboard

## 3. Core Invariants

- Every private record belongs to an authenticated owner.
- Every meaningful mutation creates or updates an auditable record.
- Agent output is never trusted until schema validated.
- If OpenClaw is configured and fails, failure must be visible.
- Dashboard data is a projection of stored records, not independently edited.
- Frontend state can be optimistic, but API and Supabase state are the source of truth.
- No write should appear successful unless persistence succeeded.

## 4. Allowed Mutation Verbs

- create
- update
- import
- promote
- request approval
- resolve approval
- research

Each mutation must have one canonical API path and one canonical post-success refetch path.

## 5. Critical Flows

- Lead create: validate input, persist lead, create activity, award XP, return canonical response.
- Lead update: validate input, persist changes, create activity, return updated lead.
- Lead promote: create or update client, update lead state, create activity, refetch dependent views.
- Lead research: create run, execute runtime, validate output, persist result, complete or fail run visibly.

## 6. Auth / Ownership Rules

- Browser access to the command centre requires Supabase browser auth configuration.
- Private API routes require a valid Supabase bearer token.
- The API scopes repositories to the authenticated Supabase user id.
- Public diagnostics endpoints do not grant access to private records.
- The service role key never reaches the browser.

## 7. Agent / OpenClaw Rules

- OpenClaw output is untrusted until JSON parse and schema validation both pass.
- Configured OpenClaw failures must not silently fall back to mock mode.
- Mock mode is only used when OpenClaw is not configured.
- Failed runs must be persisted and visible in the Agents screen.
- Lead status must be restored on research failure so records do not remain stuck in unclear intermediate state.

## 8. Activity / Audit Rules

- Lead create, update, promote, and research completion must create activity records.
- Research failure may log agent-run failure activity, but it must not create misleading success activity.
- Activity is append-only operational history, not editable working state.

## 9. Frontend Query / Refetch Rules

- Query keys are defined centrally in `apps/web/src/lib/query/keys.ts`.
- Mutation invalidation lives in `apps/web/src/lib/query/refetchers.ts`.
- Pages should use domain APIs instead of growing a generic API surface indefinitely.
- Loading, empty, success, and failure states must be visible for user-facing writes and runtime actions.

## 10. Non-Goals

- Silent demo fallback in production-style operation
- Trusting model output without schema validation
- Treating diagnostics as the primary auth gate
- Splitting one mutation across multiple hidden UI pathways
- Marking writes successful before the database confirms persistence
