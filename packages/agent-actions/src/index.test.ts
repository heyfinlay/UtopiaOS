import { afterEach, describe, expect, it, vi } from "vitest";

import { getAgentConnectionStatus, runResearchLeadAction } from "./index";

describe("runResearchLeadAction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns validated structured research in mock mode", async () => {
    vi.stubEnv("OPENCLAW_COMMAND", "");

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

  it("throws when the configured agent command fails", async () => {
    vi.stubEnv("OPENCLAW_COMMAND", "exit 7");

    await expect(
      runResearchLeadAction({
        id: "lead_2",
        name: "Dana",
        company: "Northlight Ops",
        website: "https://northlight.example",
        source: "Referral",
        priority: "high",
        status: "new",
        notes: "Needs process cleanup",
        nextAction: "Research the account",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("OpenClaw command exited with code 7.");
  });

  it("summarizes agent runtime configuration", () => {
    expect(getAgentConnectionStatus()).toEqual({
      configured: false,
      commandPreview: "OPENCLAW_COMMAND not configured",
      mode: "mock",
    });
  });
});
