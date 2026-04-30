import { describe, expect, it } from "vitest";

import { createUtopiaRepository } from "./index";

describe("createUtopiaRepository", () => {
  it("creates leads and reflects them in the dashboard", () => {
    const repository = createUtopiaRepository();
    const lead = repository.createLead({
      name: "Ava",
      company: "Orbit Systems",
      priority: "critical",
      website: "https://orbit.systems",
      source: "Inbound form",
    });

    expect(repository.getLead(lead.id)?.company).toBe("Orbit Systems");
    expect(repository.getDashboardSummary().pipeline[0]?.value).toBeGreaterThan(0);
  });
});
