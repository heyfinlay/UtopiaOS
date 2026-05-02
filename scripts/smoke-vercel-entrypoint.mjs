const supabaseUrl = process.env.SUPABASE_URL?.trim() || "https://example.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "service-role-key";

process.env.SUPABASE_URL = supabaseUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
process.env.NODE_ENV ??= "test";

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.startsWith(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`)) {
    return Response.json([], {
      headers: {
        "content-range": "0-0/0",
      },
    });
  }

  if (url === `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`) {
    return Response.json({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
  }

  return originalFetch(input, init);
};

const { default: handler } = await import("../api/[...path].js");

const checks = [
  {
    name: "GET /api/system/status",
    request: new Request("https://utopia.local/api/system/status"),
    expected: new Set([200, 401]),
  },
  {
    name: "GET /api/leads",
    request: new Request("https://utopia.local/api/leads"),
    expected: new Set([401]),
  },
  {
    name: "POST /api/leads",
    request: new Request("https://utopia.local/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Nina",
        company: "Cinder Lane",
        source: "Smoke test",
      }),
    }),
    expected: new Set([401]),
  },
];

for (const check of checks) {
  const response = await handler(check.request);

  if (response.status === 500 || !check.expected.has(response.status)) {
    const body = await response.text();
    throw new Error(
      `${check.name} returned unexpected status ${response.status}: ${body}`,
    );
  }

  console.log(`${check.name}: ${response.status}`);
}
