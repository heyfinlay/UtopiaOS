import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMemoryUtopiaRepository,
  createUtopiaRepository,
  type UtopiaRepository,
} from "@utopia/db";

import { createApp } from "./app";

describe("createApp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const createSupabaseModeRepository = (): UtopiaRepository => {
    const repository = createMemoryUtopiaRepository({
      leads: [],
      clients: [],
      approvals: [],
      templates: [],
      activities: [],
      agentRuns: [],
      statXp: {
        sales: 0,
        delivery: 0,
        content: 0,
        systems: 0,
        relationships: 0,
        revenue: 0,
        discipline: 0,
      },
    });

    return {
      ...repository,
      mode: "supabase",
    };
  };

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

  it("reports runtime system status for the Supabase contract", async () => {
    const repository = createSupabaseModeRepository();
    const app = createApp(repository, {
      persistence: {
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        supabaseConfigured: true,
        ownerConfigured: false,
        ownerIdFormatValid: false,
        persistenceEnabled: true,
      },
      verifyAccessToken: vi.fn(async () => null),
      createRepositoryForOwner: vi.fn(() => ({
        ...repository,
        getSchemaCheck: vi.fn(async () => ({
          ok: true,
          missing: [],
        })),
      })),
    });

    const response = await app.request("/api/system/status");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.repositoryMode).toBe("supabase");
    expect(payload.agentMode).toBe("mock");
    expect(payload.supabaseUrlConfigured).toBe(true);
    expect(payload.serviceRoleConfigured).toBe(true);
    expect(payload.authRequired).toBe(true);
    expect(payload.currentRequestAuthenticated).toBe(false);
    expect(payload.ownerSource).toBe("none");
  });

  it("uses the configured repository mode when the app is created", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("UTOPIA_OWNER_ID", "");

    const app = createApp();
    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.repositoryMode).toBe("supabase");
  });

  it("fails fast when the app is created without required Supabase env", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("UTOPIA_OWNER_ID", "");

    expect(() => createApp()).toThrow(
      "Supabase persistence is required. Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.",
    );
  });

  it("rejects unauthenticated dashboard access in supabase mode", async () => {
    const repository = createSupabaseModeRepository();
    const app = createApp(repository, {
      persistence: {
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        supabaseConfigured: true,
        ownerConfigured: false,
        ownerIdFormatValid: false,
        persistenceEnabled: true,
      },
      verifyAccessToken: vi.fn(async () => null),
      createRepositoryForOwner: vi.fn(() => ({
        ...repository,
        getSchemaCheck: vi.fn(async () => ({
          ok: true,
          missing: [],
        })),
      })),
    });

    const response = await app.request("/api/dashboard");

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error).toBe("Unauthorized");
  });

  it("does not use UTOPIA_OWNER_ID as a public-route fallback owner in supabase mode", async () => {
    vi.stubEnv("UTOPIA_OWNER_ID", "550e8400-e29b-41d4-a716-446655440000");

    const repository = createSupabaseModeRepository();
    const createRepositoryForOwner = vi.fn(() => ({
      ...repository,
      getSchemaCheck: vi.fn(async () => ({
        ok: true,
        missing: [],
      })),
    }));
    const app = createApp(repository, {
      persistence: {
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        supabaseConfigured: true,
        ownerConfigured: true,
        ownerIdFormatValid: true,
        persistenceEnabled: true,
      },
      verifyAccessToken: vi.fn(async () => null),
      createRepositoryForOwner,
    });

    const response = await app.request("/api/system/status");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ownerSource).toBe("none");
    expect(createRepositoryForOwner).not.toHaveBeenCalled();
  });

  it("allows authenticated dashboard access in supabase mode", async () => {
    const repository = createSupabaseModeRepository();
    const ownerRepository = createMemoryUtopiaRepository({
      leads: [],
      clients: [],
      approvals: [],
      templates: [],
      activities: [],
      agentRuns: [],
      statXp: {
        sales: 0,
        delivery: 0,
        content: 0,
        systems: 0,
        relationships: 0,
        revenue: 0,
        discipline: 0,
      },
    });
    const app = createApp(repository, {
      persistence: {
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        supabaseConfigured: true,
        ownerConfigured: false,
        ownerIdFormatValid: false,
        persistenceEnabled: true,
      },
      verifyAccessToken: vi.fn(async () => ({ id: "user-123" })),
      createRepositoryForOwner: vi.fn(() => ({
        ...ownerRepository,
        mode: "supabase" as const,
      })),
    });

    const response = await app.request("/api/dashboard", {
      headers: {
        authorization: "Bearer token-123",
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.stats).toHaveLength(7);
  });

  it("creates leads in supabase mode for authenticated users", async () => {
    const repository = createSupabaseModeRepository();
    const ownerRepository = createMemoryUtopiaRepository({
      leads: [],
      clients: [],
      approvals: [],
      templates: [],
      activities: [],
      agentRuns: [],
      statXp: {
        sales: 0,
        delivery: 0,
        content: 0,
        systems: 0,
        relationships: 0,
        revenue: 0,
        discipline: 0,
      },
    });
    const app = createApp(repository, {
      persistence: {
        supabaseUrlConfigured: true,
        serviceRoleConfigured: true,
        supabaseConfigured: true,
        ownerConfigured: false,
        ownerIdFormatValid: false,
        persistenceEnabled: true,
      },
      verifyAccessToken: vi.fn(async () => ({ id: "user-123" })),
      createRepositoryForOwner: vi.fn(() => ({
        ...ownerRepository,
        mode: "supabase" as const,
      })),
    });

    const response = await app.request("/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token-123",
      },
      body: JSON.stringify({
        name: "Nina",
        company: "Cinder Lane",
      }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.lead.company).toBe("Cinder Lane");
    expect(payload.activity.kind).toBe("lead.created");
    expect(
      payload.stats.find((stat: { key: string }) => stat.key === "systems")?.xp,
    ).toBeGreaterThan(0);
  });

  it("returns a valid empty dashboard state", async () => {
    const repository = createMemoryUtopiaRepository({
      leads: [],
      clients: [],
      approvals: [],
      templates: [],
      activities: [],
      agentRuns: [],
      statXp: {
        sales: 0,
        delivery: 0,
        content: 0,
        systems: 0,
        relationships: 0,
        revenue: 0,
        discipline: 0,
      },
    });
    const app = createApp(repository);

    const response = await app.request("/api/dashboard");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.actionItems).toHaveLength(1);
    expect(payload.stats).toHaveLength(7);
    expect(payload.recentActivity).toEqual([]);
    expect(payload.agentRuns).toEqual([]);
    expect(payload.approvals).toEqual([]);
    expect(payload.featuredLead).toBeNull();
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

  it("returns JSON errors with a request id for unhandled failures", async () => {
    const repository: UtopiaRepository = {
      mode: "memory",
      reset: vi.fn(async () => undefined),
      getSchemaCheck: vi.fn(async () => null),
      getDashboardSummary: vi.fn(async () => {
        throw new Error("dashboard exploded");
      }),
      listProgressStats: vi.fn(async () => []),
      listLeads: vi.fn(async () => []),
      getLead: vi.fn(async () => null),
      createLead: vi.fn(async () => {
        throw new Error("not used");
      }),
      createLeadWithActivity: vi.fn(async () => {
        throw new Error("not used");
      }),
      updateLead: vi.fn(async () => null),
      updateLeadWithActivity: vi.fn(async () => null),
      updateLeadStatus: vi.fn(async () => null),
      applyResearchToLead: vi.fn(async () => null),
      awardXp: vi.fn(async () => []),
      createActivity: vi.fn(async () => {
        throw new Error("not used");
      }),
      createAgentRun: vi.fn(async () => {
        throw new Error("not used");
      }),
      updateAgentRun: vi.fn(async () => null),
      startLeadResearchRun: vi.fn(async () => null),
      completeLeadResearch: vi.fn(async () => null),
      failLeadResearch: vi.fn(async () => ({ lead: null, agentRun: null })),
      listApprovals: vi.fn(async () => []),
      createApproval: vi.fn(async () => {
        throw new Error("not used");
      }),
      resolveApproval: vi.fn(async () => null),
      listClients: vi.fn(async () => []),
      promoteLeadToClient: vi.fn(async () => null),
      promoteLeadWithActivity: vi.fn(async () => null),
      updateClient: vi.fn(async () => null),
      listTemplates: vi.fn(async () => []),
      createTemplate: vi.fn(async () => {
        throw new Error("not used");
      }),
      updateTemplate: vi.fn(async () => null),
    };
    const app = createApp(repository);

    const response = await app.request("/api/dashboard");

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toBe("Internal Server Error");
    expect(payload.requestId).toEqual(expect.any(String));
  });
});
