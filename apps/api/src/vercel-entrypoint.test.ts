import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const leadRow = {
  id: "lead-1",
  name: "Nina",
  company: "Cinder Lane",
  website: "https://cinderlane.com",
  source: "Referral",
  priority: "normal",
  status: "new",
  notes: "Wants faster onboarding",
  next_action: null,
  research_payload: {},
  commercial_profile: {},
  delivery_profile: {},
  last_researched_at: null,
  created_at: "2026-05-05T00:00:00.000Z",
  updated_at: "2026-05-05T00:00:00.000Z",
};

describe("Vercel API entrypoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the ESM API app through cached dynamic import", () => {
    const source = readFileSync(
      new URL("../../../api/[...path].js", import.meta.url),
      "utf8",
    );

    expect(source).toContain('import("../apps/api/dist/app.js")');
    expect(source).toContain("direct-leads-insert-2026-05-05-v1");
    expect(source).toContain("vercel.entrypoint.directLeadCreate.before");
    expect(source).toContain("vercel-entrypoint-debug-2026-05-02-v2");
    expect(source).toContain("vercel.entrypoint.enter");
    expect(source).not.toContain('from "../apps/api/src/app.js"');
    expect(source).not.toMatch(/\brequire\s*\(/);
  });

  it("handles POST /api/leads directly without the Hono app", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input.toString() : String(input);

      if (url === "https://example.supabase.co/auth/v1/user") {
        return Response.json({
          id: "550e8400-e29b-41d4-a716-446655440000",
        });
      }

      if (url.startsWith("https://example.supabase.co/rest/v1/leads")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          owner_id: "550e8400-e29b-41d4-a716-446655440000",
          name: "Nina",
          company: "Cinder Lane",
          website: "https://cinderlane.com",
          source: "Referral",
          priority: "normal",
          notes: "Wants faster onboarding",
        });

        return Response.json(leadRow, {
          status: 201,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const entrypointPath = new URL("../../../api/[...path].js", import.meta.url).href;
    const { default: handler } = await import(entrypointPath);

    const response = await handler(
      new Request("https://utopia.local/api/leads", {
        method: "POST",
        headers: {
          authorization: "Bearer token-123",
          "content-type": "application/json",
          "x-request-id": "request-123",
        },
        body: JSON.stringify({
          name: "Nina",
          company: "Cinder Lane",
          website: "https://cinderlane.com",
          source: "Referral",
          priority: "normal",
          notes: "Wants faster onboarding",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      lead: {
        id: "lead-1",
        company: "Cinder Lane",
      },
      apiBuildFingerprint: "direct-leads-insert-2026-05-05-v1",
      requestId: "request-123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/user",
      expect.any(Object),
    );
  });
});
