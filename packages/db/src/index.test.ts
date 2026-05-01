import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createConfiguredUtopiaRepository,
  createUtopiaRepository,
  getPersistenceConfigState,
} from "./index";

describe("createUtopiaRepository", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("updates leads, manages approvals, promotes clients, and versions templates", async () => {
    const repository = createUtopiaRepository();
    const lead = await repository.createLead({
      name: "Tessa",
      company: "Bright Ops",
      priority: "high",
      source: "Referral",
    });

    const updatedLead = await repository.updateLead(lead.id, {
      status: "qualified",
      nextAction: "Book a paid workflow audit.",
      commercial: {
        weightedValue: 7_500,
        invoiceOutstanding: 0,
        nextRevenueMilestone: "Convert into audit scope.",
      },
    });
    const approval = await repository.createApproval({
      action: "change_lead_status",
      targetType: "lead",
      targetId: lead.id,
      title: "Approve status change",
      summary: "Move the account into proposal.",
      payload: { status: "proposal" },
    });
    const resolvedApproval = await repository.resolveApproval(approval.id, "approved");
    const promoted = await repository.promoteLeadToClient(lead.id, {
      auditNote: "Strong delivery fit.",
      roadmapItem: "Scope first implementation sprint.",
    });
    const template = await repository.createTemplate({
      title: "Follow-up prompt",
      category: "Sales",
      body: "Draft a short follow-up that asks for the next call.",
    });
    const updatedTemplate = await repository.updateTemplate(template.id, {
      body: "Draft a short follow-up that asks for the next call and names the bottleneck.",
    });

    expect(updatedLead?.status).toBe("qualified");
    expect(resolvedApproval?.status).toBe("approved");
    expect(promoted?.client.company).toBe("Bright Ops");
    expect(updatedTemplate?.version).toBe(2);
  });

  it("falls back to memory mode when only part of the Supabase env is present", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("UTOPIA_OWNER_ID", "");

    const config = getPersistenceConfigState();
    const repository = createConfiguredUtopiaRepository();

    expect(config.supabaseConfigured).toBe(false);
    expect(config.persistenceEnabled).toBe(false);
    expect(repository.mode).toBe("memory");

    vi.unstubAllEnvs();
  });

  it("reports persistence configuration and keeps incomplete Supabase env in memory mode", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("UTOPIA_OWNER_ID", "not-a-uuid");

    const config = getPersistenceConfigState();
    const repository = createConfiguredUtopiaRepository();

    expect(config.supabaseUrlConfigured).toBe(true);
    expect(config.serviceRoleConfigured).toBe(false);
    expect(config.ownerConfigured).toBe(true);
    expect(config.ownerIdFormatValid).toBe(false);
    expect(config.persistenceEnabled).toBe(false);
    expect(repository.mode).toBe("memory");

    vi.unstubAllEnvs();
  });

  it("enables Supabase mode without requiring UTOPIA_OWNER_ID", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("UTOPIA_OWNER_ID", "");

    const config = getPersistenceConfigState();
    const repository = createConfiguredUtopiaRepository();

    expect(config.supabaseConfigured).toBe(true);
    expect(config.ownerConfigured).toBe(false);
    expect(config.ownerIdFormatValid).toBe(false);
    expect(config.persistenceEnabled).toBe(true);
    expect(repository.mode).toBe("supabase");
  });

  it("keeps the repository column expectations aligned with the checked-in migrations", () => {
    const migrationSql = [
      "20260430191500_utopia_command_init.sql",
      "20260430201000_utopia_revenue_delivery_profiles.sql",
      "20260501023000_utopia_approvals.sql",
    ]
      .map((filename) =>
        readFileSync(
          new URL(`../../../supabase/migrations/${filename}`, import.meta.url),
          "utf8",
        ),
      )
      .join("\n");

    expect(migrationSql).toContain("owner_id uuid not null references auth.users");
    expect(migrationSql).toContain("research_payload jsonb not null");
    expect(migrationSql).toContain("commercial_profile jsonb not null");
    expect(migrationSql).toContain("delivery_profile jsonb not null");
    expect(migrationSql).toContain("next_action text");
    expect(migrationSql).toContain("last_researched_at timestamptz");
  });
});
