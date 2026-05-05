import { handle } from "@hono/node-server/vercel";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const VERCEL_ENTRYPOINT_FINGERPRINT = "vercel-entrypoint-debug-2026-05-02-v2";
const DIRECT_LEADS_FINGERPRINT = "direct-leads-insert-2026-05-05-v1";
const directLeadBodyTimeoutMs = 5_000;
const directLeadInsertTimeoutMs = 8_000;
const leadSelectColumns =
  "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at";

export const config = {
  runtime: "nodejs",
};

let appPromise;
let nodeHandlerPromise;
let supabaseAdminClient;

const emptyToUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTrimmedInputString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalUrlInputString = z.preprocess(
  emptyToUndefined,
  z.string().trim().url().optional(),
);

const directCreateLeadInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(120),
  website: optionalUrlInputString,
  source: optionalTrimmedInputString,
  priority: z.enum(["critical", "high", "normal"]).default("normal"),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ).optional(),
});

const normalizeApiPath = (url) => {
  if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    const parsed = new URL(url);

    if (!parsed.pathname.startsWith("/api/") && parsed.pathname !== "/api" && parsed.pathname !== "/health") {
      parsed.pathname = `/api${parsed.pathname}`;
    }

    return parsed.href;
  }

  if (
    typeof url !== "string" ||
    url === "" ||
    url.startsWith("/api/") ||
    url === "/api" ||
    url === "/health"
  ) {
    return url;
  }

  return url.startsWith("/") ? `/api${url}` : url;
};

const normalizeNodeRequest = (request) => {
  request.url = normalizeApiPath(request.url);
  return request;
};

const normalizeWebRequest = (request) => {
  const url = new URL(request.url);
  const normalizedPath = normalizeApiPath(`${url.pathname}${url.search}`);

  if (normalizedPath === `${url.pathname}${url.search}`) {
    return request;
  }

  return new Request(new URL(normalizedPath, url.origin), request);
};

const getRequestPath = (url) => {
  const normalized = normalizeApiPath(url);

  if (typeof normalized !== "string" || normalized === "") {
    return "";
  }

  try {
    return new URL(normalized, "https://utopia.local").pathname;
  } catch {
    return "";
  }
};

const isDirectLeadCreateRequest = (request) =>
  request?.method === "POST" && getRequestPath(request.url) === "/api/leads";

const createRequestId = (request) =>
  request.headers?.["x-request-id"] ||
  request.headers?.["x-vercel-id"] ||
  request.headers?.get?.("x-request-id") ||
  request.headers?.get?.("x-vercel-id") ||
  globalThis.crypto.randomUUID();

const getHeader = (request, name) => {
  const headers = request.headers;

  if (!headers) {
    return undefined;
  }

  if (typeof headers.get === "function") {
    return headers.get(name) ?? undefined;
  }

  return headers[name.toLowerCase()] ?? headers[name];
};

const sendJson = (response, status, payload, requestId) => {
  if (!response) {
    return Response.json(payload, {
      status,
      headers: {
        "x-request-id": requestId,
      },
    });
  }

  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.setHeader("x-request-id", requestId);
  response.end(JSON.stringify(payload));
  return undefined;
};

const readNodeJsonBody = async (request, timeoutMs) => {
  let timeout;

  try {
    const bodyPromise = (async () => {
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }

      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    })();

    const timeoutPromise = new Promise((_, reject) => {
      timeout = globalThis.setTimeout(() => {
        request.destroy?.(new Error("Request body parsing timed out."));
        reject(new Error(`Request JSON body parsing timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    return await Promise.race([bodyPromise, timeoutPromise]);
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
};

const readJsonBody = async (request, timeoutMs) => {
  if (typeof request.json === "function") {
    let timeout;

    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeout = globalThis.setTimeout(() => {
          reject(new Error(`Request JSON body parsing timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      });

      return await Promise.race([request.json(), timeoutPromise]);
    } finally {
      if (timeout) {
        globalThis.clearTimeout(timeout);
      }
    }
  }

  return readNodeJsonBody(request, timeoutMs);
};

const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  supabaseAdminClient ??= createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminClient;
};

const verifySupabaseUser = async (accessToken) => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase auth configuration.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: serviceRoleKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();

  return typeof payload.id === "string" && payload.id.trim()
    ? { id: payload.id }
    : null;
};

const withAbortableTimeout = async (label, query, timeoutMs) => {
  const controller = new AbortController();
  const abortableQuery =
    typeof query.abortSignal === "function"
      ? query.abortSignal(controller.signal)
      : query;
  let timeout;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeout = globalThis.setTimeout(() => {
        controller.abort();
        reject(new Error(`Supabase operation timed out: ${label}`));
      }, timeoutMs);
    });

    return await Promise.race([abortableQuery, timeoutPromise]);
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
};

const optionalString = (value) =>
  typeof value === "string" && value.trim() ? value : undefined;

const toLeadResponse = (row) => ({
  id: row.id,
  name: row.name,
  company: row.company,
  website: optionalString(row.website),
  source: optionalString(row.source),
  priority: row.priority,
  status: row.status,
  notes: optionalString(row.notes),
  nextAction: optionalString(row.next_action),
  lastResearchedAt: row.last_researched_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const handleDirectLeadCreate = async (request, response) => {
  const requestId = createRequestId(request);
  const logContext = {
    requestId,
    fingerprint: DIRECT_LEADS_FINGERPRINT,
    method: request.method,
    url: request.url,
  };

  console.info("direct.leads.post.enter", logContext);

  try {
    const authorization = getHeader(request, "authorization")?.trim() ?? "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      console.info("direct.leads.auth.failed", {
        ...logContext,
        reason: "missing_bearer_token",
      });
      return sendJson(
        response,
        401,
        {
          error: "Unauthorized",
          message: "Authentication required.",
          requestId,
        },
        requestId,
      );
    }

    console.info("direct.leads.auth.start", logContext);
    const user = await verifySupabaseUser(accessToken);

    if (!user) {
      console.info("direct.leads.auth.failed", {
        ...logContext,
        reason: "invalid_token",
      });
      return sendJson(
        response,
        401,
        {
          error: "Unauthorized",
          message: "Authentication required.",
          requestId,
        },
        requestId,
      );
    }

    console.info("direct.leads.auth.success", {
      ...logContext,
      currentUserId: user.id,
    });
    console.info("direct.leads.body_parse.start", {
      ...logContext,
      timeoutMs: directLeadBodyTimeoutMs,
    });

    let body;

    try {
      body = await readJsonBody(request, directLeadBodyTimeoutMs);
    } catch (error) {
      console.error("direct.leads.body_parse.failed", {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
      });
      return sendJson(
        response,
        error instanceof Error && error.message.includes("timed out") ? 408 : 400,
        {
          error: "Invalid lead payload.",
          requestId,
        },
        requestId,
      );
    }

    console.info("direct.leads.body_parse.success", logContext);
    console.info("direct.leads.validation.start", logContext);
    const validation = directCreateLeadInputSchema.safeParse(body);

    if (!validation.success) {
      const issues = validation.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
        code: issue.code,
      }));
      console.error("direct.leads.validation.failed", {
        ...logContext,
        issues,
      });
      return sendJson(
        response,
        400,
        {
          error: "Invalid lead details.",
          requestId,
        },
        requestId,
      );
    }

    console.info("direct.leads.validation.success", logContext);
    console.info("direct.leads.insert.start", {
      ...logContext,
      currentUserId: user.id,
    });

    const leadInsert = {
      owner_id: user.id,
      name: validation.data.name,
      company: validation.data.company,
      website: validation.data.website ?? null,
      source: validation.data.source ?? null,
      priority: validation.data.priority,
      notes: validation.data.notes ?? null,
    };
    const { data, error } = await withAbortableTimeout(
      "leads.insert",
      getSupabaseAdminClient()
        .from("leads")
        .insert(leadInsert)
        .select(leadSelectColumns)
        .single(),
      directLeadInsertTimeoutMs,
    );

    if (error) {
      throw new Error(error.message ?? "Failed to create lead.");
    }

    console.info("direct.leads.insert.success", {
      ...logContext,
      leadId: data.id,
    });
    console.info("direct.leads.response", {
      ...logContext,
      leadId: data.id,
    });

    return sendJson(
      response,
      201,
      {
        lead: toLeadResponse(data),
        apiBuildFingerprint: DIRECT_LEADS_FINGERPRINT,
        requestId,
      },
      requestId,
    );
  } catch (error) {
    console.error("direct.leads.failed", {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
    });

    return sendJson(
      response,
      500,
      {
        error: "Unable to create lead right now.",
        requestId,
      },
      requestId,
    );
  }
};

const getApp = () => {
  console.info("vercel.entrypoint.importApp.before", {
    fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
  });
  appPromise ??= import("../apps/api/dist/app.js")
    .then(({ createApp }) => {
      console.info("vercel.entrypoint.importApp.after", {
        fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
      });
      return createApp();
    })
    .catch((error) => {
      appPromise = undefined;
      throw error;
    });

  return appPromise;
};

const getNodeHandler = (app) => {
  nodeHandlerPromise ??= Promise.resolve(handle(app));

  return nodeHandlerPromise;
};

export default async function handler(request, response) {
  console.info("vercel.entrypoint.enter", {
    fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
    method: request.method,
    url: request.url,
  });

  if (isDirectLeadCreateRequest(request)) {
    console.info("vercel.entrypoint.directLeadCreate.before", {
      fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
      method: request.method,
      url: request.url,
    });
    return handleDirectLeadCreate(request, response);
  }

  if (response) {
    console.info("vercel.entrypoint.getApp.before", {
      fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
      method: request.method,
      url: request.url,
    });
    const app = await getApp();
    console.info("vercel.entrypoint.getApp.after", {
      fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
      method: request.method,
      url: request.url,
    });
    const nodeHandler = await getNodeHandler(app);
    console.info("vercel.entrypoint.invokeNodeHandler.before", {
      fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
      method: request.method,
      url: request.url,
    });
    return nodeHandler(normalizeNodeRequest(request), response);
  }

  console.info("vercel.entrypoint.getApp.before", {
    fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
    method: request.method,
    url: request.url,
  });
  const app = await getApp();
  console.info("vercel.entrypoint.getApp.after", {
    fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
    method: request.method,
    url: request.url,
  });
  console.info("vercel.entrypoint.invokeHonoFetch.before", {
    fingerprint: VERCEL_ENTRYPOINT_FINGERPRINT,
    method: request.method,
    url: request.url,
  });

  return app.fetch(normalizeWebRequest(request));
}
