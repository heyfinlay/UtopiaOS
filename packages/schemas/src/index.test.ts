import { describe, expect, it } from "vitest";

import { createLeadInputSchema, importLeadsInputSchema, systemStatusSchema } from "./index";

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

describe("systemStatusSchema", () => {
  it("accepts only the Supabase runtime contract", () => {
    const status = systemStatusSchema.parse({
      repositoryMode: "supabase",
      supabaseUrlConfigured: true,
      serviceRoleConfigured: true,
      supabaseConfigured: true,
      persistenceEnabled: true,
      authRequired: true,
      currentRequestAuthenticated: false,
      ownerSource: "none",
      agentCommandConfigured: false,
      agentCommandPreview: "OPENCLAW_COMMAND not configured",
      agentMode: "mock",
    });

    expect(status.repositoryMode).toBe("supabase");
  });
});
