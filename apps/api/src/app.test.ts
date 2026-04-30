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
});
