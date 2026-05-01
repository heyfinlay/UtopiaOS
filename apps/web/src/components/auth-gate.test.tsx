import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AuthGateView } from "./auth-gate";

describe("AuthGateView", () => {
  it("renders the login gate when auth is required and no session exists", () => {
    const markup = renderToStaticMarkup(
      <AuthGateView
        authConfigured
        authLoading={false}
        authRequired
        currentUserAuthenticated={false}
        onSignIn={vi.fn(async () => undefined)}
        onSignUp={vi.fn(async () => undefined)}
      >
        <div>app</div>
      </AuthGateView>,
    );

    expect(markup).toContain("ACCESS GATE");
    expect(markup).toContain("SUPABASE AUTH: READY");
  });
});
