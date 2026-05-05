import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, API_UNAUTHORIZED_EVENT, setAccessTokenProvider } from "./api";

describe("api client", () => {
  afterEach(() => {
    setAccessTokenProvider(null);
    vi.useRealTimers();
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

  it("sends lead creation as JSON with an explicit timeout", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ lead: { id: "lead-1" } }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.createLead({
      name: "Nina",
      company: "Cinder Lane",
      website: "https://cinderlane.com",
      priority: "normal",
      source: "Referral",
      notes: "Wants faster onboarding",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/leads"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          name: "Nina",
          company: "Cinder Lane",
          website: "https://cinderlane.com",
          priority: "normal",
          source: "Referral",
          notes: "Wants faster onboarding",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("aborts lead creation when deployment times out", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("The operation was aborted.");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const requestPromise = api.createLead({
      name: "Nina",
      company: "Cinder Lane",
      priority: "normal",
    });
    const expectation = expect(requestPromise).rejects.toMatchObject({
      status: 0,
      message: "Lead deployment timed out. Please try again.",
    });

    await vi.advanceTimersByTimeAsync(15_000);

    await expectation;
  });

  it("surfaces lead creation error responses with request id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "Unable to create lead right now.",
            requestId: "req-lead-500",
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              "x-request-id": "req-lead-500",
            },
          },
        ),
      ),
    );

    await expect(
      api.createLead({
        name: "Nina",
        company: "Cinder Lane",
        priority: "normal",
      }),
    ).rejects.toMatchObject({
      status: 500,
      requestId: "req-lead-500",
      message: "Unable to create lead right now.",
    });
  });
});
