# Issue Log

## 2026-04-30

- Resolved: workspace package entrypoints were missing, which initially broke Vitest resolution across packages.
- Resolved: TypeScript 6 declaration builds failed on `baseUrl` deprecation warnings until the workspace configs explicitly silenced them.
- Ongoing integration risk: exact local OpenClaw CLI shape may differ from the stdin-based `OPENCLAW_COMMAND` contract used by the current gateway.
