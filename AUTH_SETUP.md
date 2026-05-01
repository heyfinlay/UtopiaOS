# Supabase Auth Setup

## Required server env vars

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Required browser env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

## Setup

1. In Supabase, enable the auth providers you want to use.
2. Create at least one user in Authentication, or sign up through the app.
3. Copy the project URL into both `SUPABASE_URL` and `VITE_SUPABASE_URL`.
4. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
5. Copy the publishable key into `VITE_SUPABASE_PUBLISHABLE_KEY` or set `VITE_SUPABASE_ANON_KEY`.
6. Restart or redeploy the app after updating env vars.

## Expected runtime behavior

When the server and browser env vars are present:

- the API starts successfully
- the frontend shows the `ACCESS GATE` until a user signs in
- authenticated API requests are scoped to the signed-in Supabase user
- `/api/system/status` reports `repositoryMode: "supabase"`

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

1. Start the app with the server and browser Supabase env vars set.
2. Open the login screen.
3. Use `Create Account`.
4. If your project requires email confirmation, confirm the email and sign in again.
5. Load the app and confirm authenticated API calls succeed.
