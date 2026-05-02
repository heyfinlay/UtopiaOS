import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const supabaseUrl = process.env.SUPABASE_URL?.trim() || "https://example.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "service-role-key";

process.env.SUPABASE_URL = supabaseUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
process.env.NODE_ENV ??= "test";

const apiAppBundle = readFileSync(new URL("../apps/api/dist/app.js", import.meta.url), "utf8");

if (/from\s+["']@utopia\//.test(apiAppBundle) || /import\(["']@utopia\//.test(apiAppBundle)) {
  throw new Error("apps/api/dist/app.js still imports internal @utopia packages at runtime.");
}

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

const server = createServer((request, response) => {
  void handler(request, response).catch((error) => {
    console.error(error);
    response.statusCode = 500;
    response.end("Vercel entrypoint smoke failed.");
  });
});

await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start smoke test server.");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const nodeChecks = [
    {
      name: "Node GET /system/status",
      response: await fetch(`${baseUrl}/system/status`),
      expected: new Set([200, 401]),
    },
    {
      name: "Node GET /leads",
      response: await fetch(`${baseUrl}/leads`),
      expected: new Set([401]),
    },
    {
      name: "Node POST /leads",
      response: await fetch(`${baseUrl}/leads`, {
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

  for (const check of nodeChecks) {
    if (check.response.status === 500 || !check.expected.has(check.response.status)) {
      const body = await check.response.text();
      throw new Error(
        `${check.name} returned unexpected status ${check.response.status}: ${body}`,
      );
    }

    console.log(`${check.name}: ${check.response.status}`);
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
