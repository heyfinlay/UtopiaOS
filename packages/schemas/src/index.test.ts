import { describe, expect, it } from "vitest";

import { createLeadInputSchema, importLeadsInputSchema } from "./index";

describe("createLeadInputSchema", () => {
  it("normalizes blank optional fields", () => {
    const lead = createLeadInputSchema.parse({
      name: "Finlay",
      company: "Temporary Utopia",
      website: "",
      source: "",
      notes: "",
    });

    expect(lead.website).toBeUndefined();
    expect(lead.source).toBeUndefined();
    expect(lead.notes).toBeUndefined();
    expect(lead.priority).toBe("normal");
  });
});

describe("importLeadsInputSchema", () => {
  it("validates a bounded batch of lead inputs", () => {
    const payload = importLeadsInputSchema.parse({
      leads: [
        {
          name: "Mara Vale",
          company: "Signal Deck",
          priority: "high",
          source: "CSV",
        },
      ],
    });

    expect(payload.leads).toHaveLength(1);
    expect(payload.leads[0]?.priority).toBe("high");
  });
});
