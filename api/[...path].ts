import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  maxDuration: 30,
};

type VercelHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void | Promise<void>;

let cachedHandler: VercelHandler | undefined;

const importAppModule = async () => {
  try {
    return await import("../apps/api/dist/app.js");
  } catch {
    const sourceAppModulePath = "../apps/api/src/app.ts";
    return import(sourceAppModulePath);
  }
};

const getHandler = async () => {
  if (!cachedHandler) {
    const [{ handle }, { createApp }] = await Promise.all([
      import("@hono/node-server/vercel"),
      importAppModule(),
    ]);

    cachedHandler = handle(createApp());
  }

  return cachedHandler;
};

const sendStartupError = (response: ServerResponse, error: unknown) => {
  console.error("Utopia API function failed to start", error);

  response.statusCode = 500;
  response.setHeader("content-type", "application/json");
  response.end(
    JSON.stringify({
      error: "Utopia API function failed to start.",
      message: error instanceof Error ? error.message : "Unknown startup error.",
    }),
  );
};

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const honoHandler = await getHandler();
    return await honoHandler(request, response);
  } catch (error) {
    sendStartupError(response, error);
  }
}
