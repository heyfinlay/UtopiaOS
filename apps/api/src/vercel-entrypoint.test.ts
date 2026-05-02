import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel API entrypoint", () => {
  it("loads the ESM API app through cached dynamic import", () => {
    const source = readFileSync(
      new URL("../../../api/[...path].js", import.meta.url),
      "utf8",
    );

    expect(source).toContain('import("../apps/api/dist/app.js")');
    expect(source).toContain("vercel-entrypoint-debug-2026-05-02-v2");
    expect(source).toContain("vercel.entrypoint.enter");
    expect(source).not.toContain('from "../apps/api/src/app.js"');
    expect(source).not.toMatch(/\brequire\s*\(/);
  });
});
