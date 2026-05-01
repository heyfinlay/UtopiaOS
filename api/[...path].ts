import { handle } from "@hono/node-server/vercel";
import { createApp } from "../apps/api/src/app";

export const config = {
  maxDuration: 30,
};

export default handle(createApp());
