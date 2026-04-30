import { describe, expect, it } from "vitest";

import { createLeadInputSchema } from "./index";

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
