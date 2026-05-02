import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createConfiguredUtopiaRepository,
  createSupabaseUtopiaRepository,
  createUtopiaRepository,
  getPersistenceConfigState,
  withTimeout,
} from "./index";

const ownerId = "11111111-1111-4111-8111-111111111111";

const leadRow = {
  id: "lead-1",
  name: "Ava",
  company: "Orbit Systems",
  website: "https://orbit.systems",
  source: "Inbound form",
  priority: "critical",
  status: "new",
  notes: null,
  next_action: "Run AI research to sharpen the first outreach angle.",
  research_payload: {},
  commercial_profile: {
    pipelineValue: 20000,
    weightedValue: 6000,
    closedValue: 0,
    invoiceIssued: 0,
    invoiceOutstanding: 0,
    clientSavingsValue: 0,
    nextRevenueMilestone: "Qualify budget and decision urgency.",
  },
  delivery_profile: {
    stage: "scoping",
    completionPercent: 10,
    nextDeliverable: "Map the first workflow bottleneck with the client.",
    dueLabel: "This week",
    riskLevel: "medium",
  },
  last_researched_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} as const;

const createLeadsOnlyClient = () => {
  const insert = vi.fn();
  const select = vi.fn();
  const single = vi.fn(async () => ({ data: leadRow, error: null }));
  const from = vi.fn((table: string) => {
    if (table !== "leads") {
      throw new Error(`Unexpected table: ${table}`);
    }

    const builder = {
      insert: (payload: unknown) => {
        insert(payload);
        return builder;
      },
      select: (columns: string) => {
        select(columns);
        return builder;
      },
      single,
    };

    return builder;
  });

  return {
    client: { from },
    calls: { from, insert, select, single },
  };
};

describe("createUtopiaRepository", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it("creates Supabase leads through the direct leads insert path", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { client, calls } = createLeadsOnlyClient();
    const repository = createSupabaseUtopiaRepository({
      client: client as never,
      ownerId,
    });

    const lead = await repository.createLead({
      name: "Ava",
      company: "Orbit Systems",
      priority: "critical",
      website: "https://orbit.systems",
      source: "Inbound form",
    });

    expect(lead.company).toBe("Orbit Systems");
    expect(calls.from).toHaveBeenCalledWith("leads");
    expect(calls.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: ownerId,
        name: "Ava",
        company: "Orbit Systems",
        website: "https://orbit.systems",
        source: "Inbound form",
        priority: "critical",
        status: "new",
      }),
    );
    expect(calls.select).toHaveBeenCalledWith(expect.stringContaining("commercial_profile"));
    expect(calls.single).toHaveBeenCalledTimes(1);
  });

  it("returns created Supabase leads when optional activity side effects fail", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client, calls } = createLeadsOnlyClient();
    const from = vi.fn((table: string) => {
      if (table === "leads") {
        return client.from(table);
      }

      if (table === "progression_stats") {
        return {
          upsert: vi.fn(async () => ({
            data: null,
            error: { message: "stats unavailable" },
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    const repository = createSupabaseUtopiaRepository({
      client: { from } as never,
      ownerId,
    });

    const result = await repository.createLeadWithActivity({
      lead: {
        name: "Ava",
        company: "Orbit Systems",
        priority: "critical",
      },
      activity: {
        entityType: "lead",
        entityId: "pending-lead",
        kind: "lead.created",
        actor: "human",
        message: "Lead created.",
        xpAwards: {
          sales: 0,
          delivery: 0,
          content: 0,
          systems: 0,
          relationships: 0,
          revenue: 0,
          discipline: 0,
        },
      },
      xpAwards: { sales: 1 },
    });

    expect(result.lead.company).toBe("Orbit Systems");
    expect(result.activity.kind).toBe("lead.created");
    expect(calls.single).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      "lead.create.side_effects.failed",
      expect.objectContaining({
        error: expect.stringContaining("Failed to ensure progression stats row."),
      }),
    );
  });

  it("throws clear timeout errors for slow Supabase operations", async () => {
    await expect(
      withTimeout("leads.insert", new Promise(() => undefined), 1),
    ).rejects.toThrow("Supabase operation timed out: leads.insert");
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

  it("fails fast when only part of the Supabase env is present", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("UTOPIA_OWNER_ID", "");

    const config = getPersistenceConfigState();

    expect(config.supabaseConfigured).toBe(false);
    expect(config.persistenceEnabled).toBe(false);
    expect(() => createConfiguredUtopiaRepository()).toThrow(
      "Supabase persistence is required. Missing environment variables: SUPABASE_SERVICE_ROLE_KEY.",
    );

    vi.unstubAllEnvs();
  });

  it("reports persistence configuration and rejects incomplete Supabase env", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("UTOPIA_OWNER_ID", "not-a-uuid");

    const config = getPersistenceConfigState();

    expect(config.supabaseUrlConfigured).toBe(true);
    expect(config.serviceRoleConfigured).toBe(false);
    expect(config.ownerConfigured).toBe(true);
    expect(config.ownerIdFormatValid).toBe(false);
    expect(config.persistenceEnabled).toBe(false);
    expect(() => createConfiguredUtopiaRepository()).toThrow(
      "Supabase persistence is required. Missing environment variables: SUPABASE_SERVICE_ROLE_KEY.",
    );

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
