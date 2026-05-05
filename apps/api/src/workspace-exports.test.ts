import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspacePackages = [
  "../../../packages/agent-actions/package.json",
  "../../../packages/db/package.json",
  "../../../packages/schemas/package.json",
] as const;

describe("workspace runtime exports", () => {
  it("use dist by default and source only for explicit development conditions", () => {
    for (const packagePath of workspacePackages) {
      const manifest = JSON.parse(
        readFileSync(new URL(packagePath, import.meta.url), "utf8"),
      ) as {
        main?: string;
        module?: string;
        types?: string;
        exports?: {
          ".": {
            development?: string;
            import?: string;
            types?: string;
            default?: string;
          };
        };
      };

      expect(manifest.main).toBe("./dist/index.js");
      expect(manifest.module).toBe("./dist/index.js");
      expect(manifest.types).toBe("./dist/index.d.ts");
      expect(manifest.exports?.["."].development).toBe("./src/index.ts");
      expect(manifest.exports?.["."].import).toBe("./dist/index.js");
      expect(manifest.exports?.["."].default).toBe("./dist/index.js");
      expect(manifest.exports?.["."].types).toBe("./dist/index.d.ts");
    }
  });
});
