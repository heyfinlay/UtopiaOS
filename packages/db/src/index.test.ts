import { describe, expect, it } from "vitest";

import { createUtopiaRepository } from "./index";

describe("createUtopiaRepository", () => {
  it("creates leads and reflects them in the dashboard", async () => {
    const repository = createUtopiaRepository();
    const lead = await repository.createLead({
      name: "Ava",
      company: "Orbit Systems",
      priority: "critical",
      website: "https://orbit.systems",
      source: "Inbound form",
    });

    expect((await repository.getLead(lead.id))?.company).toBe("Orbit Systems");
    const dashboard = await repository.getDashboardSummary();
    expect(dashboard.pipeline[0]?.value).toBeGreaterThan(0);
    expect(dashboard.revenue.pipeline).toBeGreaterThan(0);
    expect(dashboard.actionItems.length).toBeGreaterThan(0);
  });

  it("awards xp and stores research results", async () => {
    const repository = createUtopiaRepository();
    const lead = await repository.createLead({
      name: "Mara",
      company: "Signal Deck",
      priority: "high",
      source: "Referral",
    });

    await repository.applyResearchToLead(lead.id, {
      overview: "Signal Deck has visible workflow drag that fits a scoped AI systems engagement.",
      companySnapshot: "Referral context and repeatable service work make the account actionable.",
      icpFit: "Strong fit for a founder-led service automation sprint.",
      buyingSignals: [
        "Referral context shortens trust-building.",
        "The team appears to have repeatable internal process work.",
      ],
      opportunities: [
        {
          title: "Delivery coordination automation",
          reason: "The account likely has handoff friction between discovery and delivery.",
          confidence: 78,
        },
      ],
      recommendedOffer: "AI operations audit",
      nextAction: "Draft a short note offering a rapid audit call.",
      riskFlags: ["Research is still based on intake data rather than live discovery."],
      confidence: 80,
      sources: ["Referral notes"],
    });

    const stats = await repository.awardXp({ sales: 25, systems: 10 });

    expect((await repository.getLead(lead.id))?.research?.recommendedOffer).toBe(
      "AI operations audit",
    );
    expect(stats.find((stat) => stat.key === "sales")?.xp).toBeGreaterThan(0);
  });
});
