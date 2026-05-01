# Supabase-only migration audit (May 1, 2026)

## Scope
This review maps where the application still depends on in-memory or fallback behavior and highlights mismatches that will block a clean Supabase-only deployment.

## High-impact inconsistencies

1. **API runtime still supports memory fallback and fallback owner routing.**
   - `createApp` can run without auth in memory mode and uses `UTOPIA_OWNER_ID` fallback paths (`env-fallback`, `memory-demo`).
   - Supabase-only migration requires deleting these branches and making authenticated owner resolution mandatory.
   - Files: `apps/api/src/app.ts`.

2. **Repository factory defaults to memory when Supabase env is incomplete.**
   - Persistence config intentionally reports partial env and keeps memory mode enabled.
   - This behavior directly conflicts with a strict Supabase-only deployment model.
   - Files: `packages/db/src/index.ts`, `packages/db/src/index.test.ts`.

3. **Schema contract still advertises memory mode.**
   - `repositoryModeSchema` includes `"memory" | "supabase"`.
   - System status response therefore encodes dual-mode behavior into API contracts.
   - Files: `packages/schemas/src/index.ts`.

4. **UI copy and docs still position memory+mock as a normal first-class mode.**
   - This increases operator confusion and masks deployment misconfiguration.
   - Files include `apps/web/src/pages/agents-page.tsx`, `README.md`, `docs/USAGE.md`, `docs/TECHNICAL_ARCHITECTURE.md`.

5. **Agent execution path still includes mock fallback after command failures.**
   - Even when command mode is configured, execution degrades to mock results.
   - If production reliability is a priority, this should become explicit erroring/alerting instead of silent fallback.
   - Files: `packages/agent-actions/src/index.ts`, `docs/AGENT_INTEGRATION.md`.

## Failing test discovered during full run

- `pnpm test` currently fails in `apps/api/src/app.test.ts` due to environment leakage (`SUPABASE_URL` present in runner env) making `supabaseUrlConfigured === true` when the test expects `false`.
- This was fixed by explicitly stubbing empty Supabase env values in the affected test.

## Supabase-only migration backlog

### Phase 1: hard-disable fallback behavior
- Remove memory-mode routing and `UTOPIA_OWNER_ID` fallback owner assignment in API request context.
- Make startup fail fast if required Supabase env vars are missing.
- Update health/system endpoints to reflect strict Supabase-only requirements.

### Phase 2: repository contract simplification
- Remove memory repository mode from schemas and repository interfaces used by runtime API paths.
- Keep in-memory test doubles only in test helpers (not production factory behavior).

### Phase 3: agent behavior cleanup
- Replace `mock-fallback` on command failure with explicit failed run status + actionable error payload.
- Keep mock mode only for local/dev test harnesses behind explicit `NODE_ENV=test` gates, if needed.

### Phase 4: UI and docs alignment
- Remove operator-facing messaging that suggests fallback memory is expected in deployed environments.
- Rewrite setup docs as "Supabase required" with a dedicated troubleshooting section.

## Suggested acceptance checks before feature work resumes

1. API refuses startup if Supabase env is absent/incomplete.
2. `/api/system/status` never reports `repositoryMode: memory` in non-test runtime.
3. Unauthenticated requests to protected endpoints always return `401`.
4. Research route never returns silent mock fallback in production mode.
5. End-to-end smoke test passes against a real Supabase project with migrations applied.
