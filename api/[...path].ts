import { createApp } from "../apps/api/src/app.js";

export const config = {
  runtime: "edge",
};

const app = createApp();

export default (request: Request) => app.fetch(request);
