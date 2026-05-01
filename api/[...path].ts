import { createApp } from "../apps/api/src/app.js";

export const config = {
  runtime: "nodejs",
};

const app = createApp();

export default (request: Request) => app.fetch(request);
