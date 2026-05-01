import { afterEach, describe, expect, it, vi } from "vitest";

import { api, setAccessTokenProvider } from "./api";

describe("api client", () => {
  afterEach(() => {
    setAccessTokenProvider(null);
    vi.restoreAllMocks();
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
});
