# UtopiaOS Invariants

This document is the architectural source of truth for UtopiaOS. Future agents must read it before implementing features, refactors, database migrations, API changes, frontend query changes, or OpenClaw runtime changes.

The manifesto wins by default. If implementation pressure appears to contradict this document, either change the implementation to match the manifesto or explicitly revise this document with the reason.

## What UtopiaOS Owns

UtopiaOS is the authenticated operating layer for a founder-led business command centre. It owns identity-aware business records, API contracts, persistence, auditability, dashboard projections, and the safe execution boundary between the product and OpenClaw.

UtopiaOS is responsible for:

- Proving who the current operator is.
- Scoping all private records to that authenticated owner.
- Capturing, updating, researching, importing, and promoting leads.
- Maintaining clients created from qualified or won leads.
- Persisting agent runs, their status, their prompts, their failures, and their outputs.
- Validating all OpenClaw output before it can affect business records.
- Creating activity records for meaningful business mutations.
- Awarding progression / XP only after the underlying mutation succeeds.
- Keeping approvals explicit for risky actions.
- Rendering dashboard state as a projection of stored records.
- Giving users clear loading, success, empty, unauthorized, validation, and failure states.
- Producing useful request IDs and visible errors when something fails.

## What UtopiaOS Does Not Own

UtopiaOS is not a general agent platform, a hidden CRM sync engine, or an autonomous actor with permission to mutate business state without product-level checks.

UtopiaOS is not responsible for:

- Trusting OpenClaw, model output, stdout, markdown, or JSON before schema validation.
- Silently creating demo data in production-style operation.
- Treating diagnostics endpoints as authorization.
- Letting the browser hold service-role credentials.
- Mutating private records outside an authenticated owner scope.
- Splitting one user mutation across multiple hidden API paths.
- Marking a write successful before persistence succeeds.
- Replacing approval policy with frontend-only affordances.
- Editing dashboard projections directly.
- Hiding failed agent runs, failed persistence, failed validation, or failed auth.

## Product Domains

Identity is the domain that proves the operator and supplies the ownership boundary. Browser auth uses Supabase client credentials only. Server auth verifies bearer tokens and scopes repositories to the Supabase user ID. The service role key is server-only.

Leads / CRM is the working pipeline for prospects. Leads can be created, imported, updated, researched, and promoted. Lead status and research state must reflect durable persistence, not temporary UI optimism.

Clients are durable delivery or revenue records that come from promoted leads. Client changes must preserve the relationship to the lead when available and must keep dashboard projections consistent.

Agent Runs are durable records of runtime work. A run must capture action, mode, status, target, prompt, completion, and error state. Agent runs are operational evidence, not ephemeral logs.

OpenClaw Runtime is the external execution boundary. UtopiaOS builds the prompt, invokes the configured runtime, parses stdout, validates the schema, persists accepted output, and records visible failure when execution or validation fails.

Approvals are explicit human gates for risky actions. Approval records must be owner-scoped, auditable, resolvable, and visible in the dashboard or agent surfaces that depend on them.

Activity / Audit is append-only operational history. It explains what changed, who or what acted, and which XP was awarded. Activity must not be used as mutable working state.

Progression / XP is a derived reward layer attached to successful mutations. XP must never be awarded for failed persistence or misleading success events.

Templates / Vault stores reusable operating assets. Templates can be created and updated, including archival through update semantics. The vault is persistent business state, not a local UI cache.

Dashboard is a projection layer over leads, clients, approvals, agent runs, activity, and progression. Dashboard data must be recomputable from stored records and must not be independently edited.

## Invariants That Must Never Be Broken

- Every private record belongs to exactly one authenticated owner.
- Public diagnostics endpoints never expose private records.
- The service role key never reaches the browser.
- API auth, not frontend routing, is the authority for private access.
- Supabase persistence is required in production-style operation.
- A mutation is not successful until database persistence succeeds.
- Every meaningful business mutation creates an activity record or updates an auditable run / approval record.
- Dashboard state is read-only projection state.
- Frontend optimism is temporary; API and Supabase state are authoritative.
- OpenClaw output is untrusted until JSON parsing and schema validation both pass.
- Configured OpenClaw failure must not fall back silently to mock mode.
- Mock research mode is allowed only when OpenClaw is not configured.
- Failed agent runs must be persisted and visible.
- Lead research failure must not leave a lead stuck in an unclear intermediate status.
- Approval-required actions must not be completed by bypassing the approval domain.
- Query keys and mutation refetch rules must stay centralized.
- No mutation may invent a second canonical API path for the same user intent.
- No CommonJS function may `require()` the ESM API app module.

## Allowed Mutation Verbs

Only these mutation verbs are allowed in product language, API naming, UI copy, and agent plans:

- `create`
- `update`
- `import`
- `promote`
- `requestApproval`
- `resolveApproval`
- `research`
- `archive`

`archive` is an update-style mutation for vault or future soft-delete semantics. Hard delete is not a product mutation unless this manifesto is revised with a concrete retention, audit, and approval policy.

Each mutation must have:

- One canonical API path.
- One canonical schema for input.
- One canonical response shape.
- One canonical post-success frontend refetch path.
- A visible failure state.

## Critical User Flows

Lead create:

1. Validate input against the shared schema.
2. Verify auth and resolve owner.
3. Persist the lead.
4. Create activity.
5. Award XP.
6. Return the canonical lead creation response.
7. Refetch leads and dashboard.

Lead import:

1. Validate the batch and each lead.
2. Persist all accepted leads in owner scope.
3. Report partial failure with a useful count if persistence fails mid-import.
4. Create import activity.
5. Award scaled XP only for persisted leads.
6. Refetch leads and dashboard.

Lead update:

1. Validate patch input.
2. Verify auth and owner scope.
3. Persist the update.
4. Create activity.
5. Return the updated lead.
6. Refetch lead detail, lead list, and dashboard.

Lead research:

1. Verify auth and owner scope.
2. Load the owner-scoped lead.
3. Create or start an agent run.
4. Execute OpenClaw or explicit mock mode.
5. Parse and schema-validate output.
6. Persist accepted research and run completion.
7. Persist failure and restore lead status when execution or validation fails.
8. Create accurate activity.
9. Award XP only on accepted completion.
10. Refetch lead detail, leads, dashboard, and runtime status.

Lead promote:

1. Validate promotion input.
2. Verify auth and owner scope.
3. Persist client creation or client update.
4. Update lead state consistently.
5. Create activity.
6. Return the canonical client response.
7. Refetch leads, clients, and dashboard.

Approval request:

1. Validate approval input.
2. Verify auth and owner scope.
3. Persist the pending approval.
4. Create activity if the request changes operational state.
5. Refetch approvals and dashboard.

Approval resolve:

1. Validate the decision.
2. Verify auth and owner scope.
3. Persist approved or rejected status.
4. Create resolution activity if the resolution changes operational state.
5. Refetch approvals and dashboard.

Template create / update / archive:

1. Validate input.
2. Verify auth and owner scope.
3. Persist the template mutation.
4. Refetch templates.

Client update:

1. Validate input.
2. Verify auth and owner scope.
3. Persist the client update.
4. Refetch clients and dashboard.

## OpenClaw Execution Contract

OpenClaw is an external runtime. UtopiaOS does not trust it; UtopiaOS integrates it.

UtopiaOS must provide OpenClaw:

- A single action contract for lead research.
- An owner-scoped lead snapshot.
- A prompt that explains the expected JSON contract.
- Runtime configuration through server environment only.

OpenClaw must return:

- JSON on stdout.
- Data matching the shared research result schema.
- No direct database writes.
- No hidden side effects in UtopiaOS state.

UtopiaOS must handle OpenClaw results as follows:

- If `OPENCLAW_COMMAND` is unset, run explicit mock mode and record mode as `mock`.
- If `OPENCLAW_COMMAND` is set, run `openclaw-cli` mode.
- If configured execution fails, record a failed run and do not fall back to mock.
- If stdout is not parseable JSON, record a failed run.
- If parsed JSON fails schema validation, record a failed run.
- If persistence fails after valid output, return a real persistence error with a request ID.
- No other code path may parse raw OpenClaw output.

## Frontend Query / Refetch Rules

Frontend state is allowed to feel responsive, but it is not the source of truth.

Rules:

- Query keys live in `apps/web/src/lib/query/keys.ts`.
- Mutation invalidation lives in `apps/web/src/lib/query/refetchers.ts`.
- Pages and components should call domain APIs, not generic request paths directly.
- Mutations must invalidate every projection they can affect.
- Dashboard is invalidated after lead, client, approval, research, import, promote, or XP-affecting mutations.
- Lead detail is invalidated after update, research, or promotion for that lead.
- Runtime status is invalidated after research.
- Approvals are invalidated after request or resolution.
- Templates are invalidated after create, update, or archive.
- User-facing writes must show pending, success, and failure states.
- A `401` must trigger the auth recovery path, not an infinite retry loop.
- Polling is acceptable for operational dashboards, but mutation success still requires explicit invalidation.

## Auth / Ownership Rules

Auth is mandatory for private state.

Rules:

- Browser auth requires Supabase browser configuration.
- Private API routes require a valid Supabase bearer token.
- The API verifies the token server-side.
- Repository instances are scoped to the authenticated Supabase user ID.
- `UTOPIA_OWNER_ID` is not a public-route fallback owner.
- Public health and system status routes may report diagnostics only.
- Public diagnostics must not list leads, clients, approvals, templates, agent runs, activities, or progression details.
- RLS must be enabled for owner-scoped tables in exposed schemas.
- RLS policies must enforce `auth.uid() = owner_id` for owner-managed records.
- The service role key is used only server-side for admin verification and repository access.

## Failure-Handling Rules

Failures must be visible, specific, and recoverable.

Rules:

- Every API failure response should include a request ID when a request context exists.
- Auth failures return `401`, not generic `500`.
- Validation failures return validation errors, not persistence errors.
- Missing records return `404`, not silent success.
- OpenClaw execution failure records a failed agent run.
- OpenClaw validation failure records a failed agent run.
- Persistence failure returns a real persistence error path and must not show success UI.
- Partial import failure reports how many records persisted before failure.
- Frontend mutation errors must be visible to the user.
- Production server errors must avoid leaking secrets.
- Development errors may include useful messages.
- A warm Vercel function must not permanently cache a failed app boot promise.

## Module And Deployment Rules

The Vercel API entrypoint and the API app must remain module-compatible.

Rules:

- The API package is ESM.
- The root package boundary is ESM.
- The Vercel catch-all function uses the Web `Request` / `Response` handler shape.
- The Vercel catch-all function dynamically imports the built API app.
- The catch-all function must never `require()` `apps/api/src/app.js`.
- Internal `@utopia/*` package runtime exports must point at built `dist` files, not `src/*.ts`.
- Build output must exist before deployment.
- Smoke tests must prove the entrypoint can boot without `ERR_REQUIRE_ESM`.

## Change Discipline For Future Agents

Before changing behavior:

1. Read this file.
2. Identify the affected product domain.
3. Identify the allowed mutation verb, if any.
4. Identify the canonical API path and schemas.
5. Identify required activity, XP, approval, and refetch effects.
6. Identify auth and ownership implications.
7. Identify failure states and request ID behavior.

If the desired change does not fit this manifesto, update the manifesto first and explain why.
