import { describe, expect, it } from "vitest";

import { groupLeadsByStatus } from "./dashboard";

describe("groupLeadsByStatus", () => {
  it("keeps tactical column order stable", () => {
    const grouped = groupLeadsByStatus([
      {
        id: "lead_1",
        name: "Kai",
        company: "Atlas",
        priority: "high",
        status: "qualified",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lead_2",
        name: "Nora",
        company: "Beacon",
        priority: "normal",
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    expect(grouped[0]?.status).toBe("new");
    expect(grouped[2]?.status).toBe("qualified");
  });
});

