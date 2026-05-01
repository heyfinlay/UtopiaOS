# Supabase Auth Setup

## Required server env vars

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Required browser env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

## Optional fallback

- `UTOPIA_OWNER_ID`

`UTOPIA_OWNER_ID` is now only a temporary bootstrap fallback for server diagnostics and legacy single-owner flows. Normal Supabase usage should rely on the authenticated Supabase user id.

## Supabase Auth setup

1. In Supabase, enable Email auth under Authentication.
2. Create at least one user in Authentication, or sign up through the app.
3. Copy the project URL into both `SUPABASE_URL` and `VITE_SUPABASE_URL`.
4. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
5. Copy the publishable key into `VITE_SUPABASE_PUBLISHABLE_KEY`.
6. Redeploy the app after updating Vercel env vars.

## Local testing

### Demo mode

Run without Supabase env vars:

```bash
SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= UTOPIA_OWNER_ID= pnpm dev
```

The frontend should allow direct access and `/api/system/status` should report:

- `repositoryMode: "memory"`
- `authRequired: false`
- `ownerSource: "memory-demo"`

### Supabase mode

Run with the server and browser env vars set:

```bash
pnpm dev
```

The frontend should show the `ACCESS GATE` screen until a user signs in.

## API diagnostics

Check:

```bash
curl http://localhost:8787/api/system/status
```

Expected safe fields:

- `repositoryMode`
- `supabaseConfigured`
- `authRequired`
- `currentRequestAuthenticated`
- `ownerSource`
- `agentMode`
- `agentCommandConfigured`

## First-user flow

1. Start the app with the browser Supabase env vars set.
2. Open the login screen.
3. Use `Create Account`.
4. If your Supabase project requires email confirmation, confirm the email and sign in again.
5. Load `/api/system/status` and confirm `currentRequestAuthenticated: true` after authenticated API calls.
