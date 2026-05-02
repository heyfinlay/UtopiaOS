import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAgentConnectionStatus,
  resetAgentRuntimeDiagnostics,
  runResearchLeadAction,
} from "./index";

describe("runResearchLeadAction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetAgentRuntimeDiagnostics();
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

  it("rejects invalid JSON from a configured OpenClaw command", async () => {
    vi.stubEnv("OPENCLAW_COMMAND", "printf 'not-json'");

    await expect(
      runResearchLeadAction({
        id: "lead_3",
        name: "Riley",
        company: "Patchbay",
        website: "https://patchbay.example",
        source: "Referral",
        priority: "high",
        status: "new",
        notes: "Needs cleaner research loops",
        nextAction: "Research the account",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("OpenClaw output was not valid JSON");
  });

  it("summarizes agent runtime configuration", () => {
    expect(getAgentConnectionStatus()).toMatchObject({
      configured: false,
      commandPreview: "OPENCLAW_COMMAND not configured",
      mode: "mock",
      lastRunStatus: "idle",
      expectedOutputFormat: "research_lead_json",
    });
  });
});
