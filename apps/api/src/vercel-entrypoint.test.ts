import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel API entrypoint", () => {
  it("loads the ESM API app through cached dynamic import", () => {
    const source = readFileSync(
      new URL("../../../api/[...path].js", import.meta.url),
      "utf8",
    );

    expect(source).toContain('import("../apps/api/dist/app.js")');
    expect(source).not.toContain('from "../apps/api/src/app.js"');
    expect(source).not.toMatch(/\brequire\s*\(/);
  });
});
