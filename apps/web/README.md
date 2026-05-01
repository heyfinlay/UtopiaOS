# Web App

The web app is a Vite + React operator dashboard for Utopia Command.

## Routes

- `/`: command center
- `/leads`: lead board and lead detail
- `/clients`: researched-account readiness view
- `/missions`: mission and progression view
- `/vault`: reusable prompts and safety artifacts
- `/agents`: runtime agent control and connection status

## Development

Run from the repo root:

```bash
pnpm dev
```

The frontend expects the API at `VITE_API_URL`, which defaults to `http://localhost:8787`.

## Data Sources

The web app reads from:

- `/api/dashboard`
- `/api/leads`
- `/api/leads/:leadId`
- `/api/leads/:leadId/research`
- `/api/system/status`

## Notes

- The web app expects a Supabase-backed API runtime.
- The Agents screen exposes current Supabase and agent execution state.
