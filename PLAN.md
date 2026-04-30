# Utopia Command Plan

## Phase 1: Foundation

- [x] Scaffold the monorepo with `apps/web`, `apps/api`, and shared packages.
- [x] Establish shared TypeScript, validation, and API conventions.
- [x] Add Supabase schema/migration files for the MVP entities.

## Phase 2: First Vertical Slice

- [x] Ship the command center shell with tactical dark-mode styling.
- [x] Implement lead creation from the web UI into the backend.
- [x] Implement `research_lead` with structured output, activity logging, and XP rewards.

## Phase 3: Hardening

- [x] Add tests for schemas, API actions, and mission/progression calculations.
- [x] Inspect major screens with Playwright and refine the interface polish.
- [x] Document architecture, agent safety rules, and implementation progress.

## Phase 4: Operator-Ready Runtime

- [x] Replace placeholder runtime persistence with a repository that can switch between memory and Supabase modes.
- [x] Expose runtime system status so the UI can report persistence and agent connection truthfully.
- [x] Replace placeholder navigation modules with working Clients, Missions, Vault, and Agents screens.
- [x] Add complete setup, usage, and agent integration documentation for local and Supabase-backed operation.
