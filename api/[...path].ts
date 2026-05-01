import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "@hono/node-server/vercel";
import { createApp } from "../apps/api/src/app.js";

export const config = {
  maxDuration: 30,
};

type VercelHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void | Promise<void>;

const cachedHandler: VercelHandler = handle(createApp());

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
    return await cachedHandler(request, response);
  } catch (error) {
    sendStartupError(response, error);
  }
}
