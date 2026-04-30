# Fix Log

## 2026-04-30

- Added workspace package exports so `api`, `db`, and `agent-actions` resolve cleanly in tests and builds.
- Silenced TypeScript 6 `baseUrl` deprecation gating to keep declaration builds working during the scaffold phase.
- Adjusted the generated shadcn button usage after confirming the current Base UI variant does not expose the older `asChild` API.
- Tightened the mock research copy after the first browser pass exposed awkward priority phrasing.

