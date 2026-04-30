# Architecture Log

## 2026-04-30

- Chose a pnpm workspace with separate `web`, `api`, `schemas`, `db`, and `agent-actions` modules to keep the OpenClaw bridge isolated from the UI.
- Kept the initial slice local-first so the dashboard can run before Supabase credentials are wired, while still defining the Supabase migration and repository contracts up front.
- Added a Supabase admin client helper plus SQL migration scaffolding so the in-memory repository can be swapped for a real persistence adapter without changing the API contract.
