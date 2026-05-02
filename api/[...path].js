import { handle } from "@hono/node-server/vercel";

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
  appPromise ??= import("../apps/api/dist/app.js")
    .then(({ createApp }) => createApp())
    .catch((error) => {
      appPromise = undefined;
      throw error;
    });

  return appPromise;
};

const getNodeHandler = () => {
  nodeHandlerPromise ??= getApp().then((app) => handle(app));

  return nodeHandlerPromise;
};

export default async function handler(request, response) {
  if (response) {
    const nodeHandler = await getNodeHandler();
    return nodeHandler(normalizeNodeRequest(request), response);
  }

  const app = await getApp();

  return app.fetch(normalizeWebRequest(request));
}
