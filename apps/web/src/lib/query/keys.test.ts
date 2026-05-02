import { describe, expect, it } from "vitest";

import { queryKeys } from "./keys";

describe("queryKeys", () => {
  it("returns stable domain query keys", () => {
    expect(queryKeys.dashboard()).toEqual(["dashboard"]);
    expect(queryKeys.systemStatus()).toEqual(["system-status"]);
    expect(queryKeys.leads.all()).toEqual(["leads"]);
    expect(queryKeys.leads.detail("lead-123")).toEqual(["leads", "lead-123"]);
    expect(queryKeys.clients.all()).toEqual(["clients"]);
    expect(queryKeys.approvals.all()).toEqual(["approvals"]);
    expect(queryKeys.templates.all()).toEqual(["templates"]);
    expect(queryKeys.agents.status()).toEqual(["agents", "status"]);
    expect(queryKeys.agents.runs()).toEqual(["agents", "runs"]);
  });
});
