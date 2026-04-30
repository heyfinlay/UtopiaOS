import process from "node:process";
import fs from "node:fs";
import path from "node:path";

import { serve } from "@hono/node-server";

const candidateRoots = [
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "../.."),
];

const loadEnvFile = (filename: string) => {
  const filePath = candidateRoots
    .map((root) => path.resolve(root, filename))
    .find((candidate) => fs.existsSync(candidate));

  if (!filePath) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (!key) {
      continue;
    }

    process.env[key] = value;
  }
};

loadEnvFile(".env");
loadEnvFile(".env.local");

const bootstrap = async () => {
  const { createApp } = await import("./app");
  const port = Number(process.env.PORT ?? 8787);
  const app = createApp();

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`Utopia Command API listening on http://localhost:${info.port}`);
    },
  );
};

void bootstrap();
