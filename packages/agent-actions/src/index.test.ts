import { describe, expect, it } from "vitest";

import { getAgentConnectionStatus, runResearchLeadAction } from "./index";

describe("runResearchLeadAction", () => {
  it("returns validated structured research in mock mode", async () => {
    const execution = await runResearchLeadAction({
      id: "lead_1",
      name: "Sam",
      company: "Signal Forge",
      website: "https://signalforge.io",
      source: "Outbound reply",
      priority: "high",
      status: "new",
      notes: "Needs faster proposal follow-up",
      nextAction: "Research the account",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(execution.mode).toBe("mock");
    expect(execution.result.opportunities.length).toBeGreaterThan(0);
    expect(execution.result.confidence).toBeGreaterThan(60);
  });

  it("summarizes agent runtime configuration", () => {
    expect(getAgentConnectionStatus()).toEqual({
      configured: false,
      commandPreview: "OPENCLAW_COMMAND not configured",
      mode: "mock",
    });
  });
});
