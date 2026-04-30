import { describe, expect, it } from "vitest";

import { createUtopiaRepository } from "@utopia/db";

import { createApp } from "./app";

describe("createApp", () => {
  it("creates and researches a lead end-to-end", async () => {
    const repository = createUtopiaRepository();
    const app = createApp(repository);

    const createResponse = await app.request("/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Nina",
        company: "Cinder Lane",
        website: "https://cinderlane.com",
        source: "Warm intro",
        notes: "Wants faster onboarding",
      }),
    });

    expect(createResponse.status).toBe(201);
    const createPayload = await createResponse.json();
    expect(createPayload.lead.company).toBe("Cinder Lane");

    const researchResponse = await app.request(
      `/api/leads/${createPayload.lead.id}/research`,
      {
        method: "POST",
      },
    );

    expect(researchResponse.status).toBe(200);
    const researchPayload = await researchResponse.json();
    expect(researchPayload.lead.research).toBeDefined();
    expect(researchPayload.agentRun.status).toBe("completed");
  });

  it("reports runtime system status", async () => {
    const repository = createUtopiaRepository();
    const app = createApp(repository);

    const response = await app.request("/api/system/status");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.repositoryMode).toBe("memory");
    expect(payload.agentMode).toBe("mock");
  });

  it("imports a CSV-sized lead batch through the bulk endpoint", async () => {
    const repository = createUtopiaRepository();
    const app = createApp(repository);

    const response = await app.request("/api/leads/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leads: [
          {
            name: "Ari Patel",
            company: "Ledger Lane",
            website: "https://ledgerlane.com",
            source: "CSV list",
            priority: "critical",
            notes: "Manual reporting bottleneck",
          },
          {
            name: "June Kline",
            company: "Northstar Studio",
            source: "CSV list",
            priority: "normal",
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.leads).toHaveLength(2);
    expect(payload.activity.kind).toBe("lead.imported");

    const leadsResponse = await app.request("/api/leads");
    const leadsPayload = await leadsResponse.json();
    expect(
      leadsPayload.leads.some(
        (lead: { company: string }) => lead.company === "Ledger Lane",
      ),
    ).toBe(true);
  });

  it("supports lead updates, approvals, clients, and vault templates", async () => {
    const repository = createUtopiaRepository();
    const app = createApp(repository);

    const createResponse = await app.request("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Kai",
        company: "Northstar Ops",
        priority: "high",
      }),
    });
    const createPayload = await createResponse.json();

    const updateResponse = await app.request(
      `/api/leads/${createPayload.lead.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "qualified",
          nextAction: "Shape the paid audit scope.",
        }),
      },
    );
    expect(updateResponse.status).toBe(200);

    const approvalResponse = await app.request("/api/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "change_lead_status",
        targetType: "lead",
        targetId: createPayload.lead.id,
        title: "Approve proposal move",
        summary: "Move this account into proposal after review.",
      }),
    });
    const approvalPayload = await approvalResponse.json();
    expect(approvalPayload.approval.status).toBe("pending");

    const resolveResponse = await app.request(
      `/api/approvals/${approvalPayload.approval.id}/resolve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "approved" }),
      },
    );
    expect(resolveResponse.status).toBe(200);

    const promoteResponse = await app.request(
      `/api/leads/${createPayload.lead.id}/promote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          auditNote: "Validated as a delivery candidate.",
          roadmapItem: "Run discovery and scope implementation.",
        }),
      },
    );
    expect(promoteResponse.status).toBe(201);

    const templateResponse = await app.request("/api/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Discovery checklist",
        category: "Delivery",
        body: "Confirm goal, bottleneck, owner, deadline, and approval path.",
      }),
    });
    expect(templateResponse.status).toBe(201);
  });
});
