# Supabase-only migration audit (May 1, 2026)

## Scope
This review originally mapped where the application still depended on in-memory or fallback behavior and highlighted mismatches that would block a clean Supabase-only deployment.

Current source of truth: [`docs/UTOPIA_OS_INVARIANTS.md`](/Users/finlaysturzaker/Documents/UtopiaOS/docs/UTOPIA_OS_INVARIANTS.md). If this audit conflicts with the invariants document, the invariants document wins.

## Findings Status

1. **Resolved: API runtime no longer uses public fallback owner routing.**
   - `UTOPIA_OWNER_ID` is not a public-route fallback owner.
   - Private API routes require authenticated owner resolution.
   - Memory repositories remain available for tests and explicit in-memory test construction, not production-style fallback routing.
   - Files: `apps/api/src/app.ts`, `apps/api/src/app.test.ts`.

2. **Resolved: repository factory fails fast when Supabase env is incomplete.**
   - The production factory requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Incomplete Supabase configuration is reported as a startup/configuration failure, not a silent memory fallback.
   - Files: `packages/db/src/index.ts`, `packages/db/src/index.test.ts`.

3. **Accepted test/development affordance: schema contract still advertises memory mode.**
   - `repositoryModeSchema` includes `"memory" | "supabase"`.
   - This remains useful for tests and explicit local memory repositories.
   - Production-style operation must still use Supabase, per the invariants document.
   - Files: `packages/schemas/src/index.ts`.

4. **Partially resolved: UI and docs position Supabase as required.**
   - Remaining memory wording should be treated as test/local implementation detail unless it is explicitly marked as production behavior.
   - Files include `apps/web/src/pages/agents-page.tsx`, `README.md`, `docs/USAGE.md`, `docs/TECHNICAL_ARCHITECTURE.md`.

5. **Resolved: configured OpenClaw failures do not silently fall back to mock.**
   - Mock mode is allowed only when `OPENCLAW_COMMAND` is unset.
   - Configured command failure creates visible failed run state.
   - Files: `packages/agent-actions/src/index.ts`, `docs/AGENT_INTEGRATION.md`.

## Test issue discovered during full run

- `pnpm test` previously failed in `apps/api/src/app.test.ts` due to environment leakage (`SUPABASE_URL` present in runner env) making `supabaseUrlConfigured === true` when the test expected `false`.
- This was fixed by explicitly stubbing empty Supabase env values in the affected test.

## Supabase-only migration backlog

### Phase 1: hard-disable fallback behavior
- Completed: remove public fallback owner routing.
- Completed: make startup fail fast if required Supabase env vars are missing.
- Completed: update health/system endpoints to reflect strict Supabase requirements.

### Phase 2: repository contract simplification
- Remove memory repository mode from schemas and repository interfaces used by runtime API paths.
- Keep in-memory test doubles only in test helpers (not production factory behavior).

### Phase 3: agent behavior cleanup
- Completed: replace command-failure mock fallback with explicit failed run status + actionable error payload.
- Keep explicit mock mode only for cases where `OPENCLAW_COMMAND` is not configured.

### Phase 4: UI and docs alignment
- Remove operator-facing messaging that suggests fallback memory is expected in deployed environments.
- Rewrite setup docs as "Supabase required" with a dedicated troubleshooting section.

## Suggested acceptance checks before feature work resumes

1. API refuses startup if Supabase env is absent/incomplete.
2. `/api/system/status` never reports `repositoryMode: memory` in non-test runtime.
3. Unauthenticated requests to protected endpoints always return `401`.
4. Research route never returns silent mock fallback in production mode.
5. End-to-end smoke test passes against a real Supabase project with migrations applied.
