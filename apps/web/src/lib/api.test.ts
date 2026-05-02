import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, API_UNAUTHORIZED_EVENT, setAccessTokenProvider } from "./api";

describe("api client", () => {
  afterEach(() => {
    setAccessTokenProvider(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("attaches the authorization header when a session token exists", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ approvals: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    setAccessTokenProvider(() => "token-123");

    await api.getApprovals();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/approvals"),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("preserves status and request id when the API returns an error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Route missing", requestId: "req-404" }), {
          status: 404,
          headers: {
            "content-type": "application/json",
            "x-request-id": "req-404",
          },
        }),
      ),
    );

    await expect(api.getTemplates()).rejects.toMatchObject({
      status: 404,
      requestId: "req-404",
      message: "Route missing",
    });
  });

  it("dispatches the unauthorized event on 401 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Authentication required." }), {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("window", new EventTarget() as Window & typeof globalThis);
    const listener = vi.fn();
    window.addEventListener(API_UNAUTHORIZED_EVENT, listener);

    await expect(api.getDashboard()).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(API_UNAUTHORIZED_EVENT, listener);
  });
});
