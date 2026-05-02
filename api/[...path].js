import { handle } from "@hono/node-server/vercel";

const VERCEL_ENTRYPOINT_FINGERPRINT = "vercel-entrypoint-debug-2026-05-02-v2";

export const config = {
  runtime: "nodejs",
};

let appPromise;
let nodeHandlerPromise;

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
