import { zValidator } from "@hono/zod-validator";
import {
  getAgentConnectionStatus,
  runResearchLeadAction,
} from "@utopia/agent-actions";
import {
  approvalResponseSchema,
  approvalsResponseSchema,
  clientsResponseSchema,
  clientResponseSchema,
  createTemplateInputSchema,
  createLeadInputSchema,
  createLeadResponseSchema,
  importLeadsInputSchema,
  importLeadsResponseSchema,
  promoteLeadToClientInputSchema,
  researchLeadResponseSchema,
  requestApprovalInputSchema,
  resolveApprovalInputSchema,
  systemStatusSchema,
  templateResponseSchema,
  templatesResponseSchema,
  updateClientInputSchema,
  updateLeadInputSchema,
  updateLeadResponseSchema,
  updateTemplateInputSchema,
} from "@utopia/schemas";
import {
  createConfiguredUtopiaRepository,
  createSupabaseAdminClient,
  createSupabaseUtopiaRepository,
  getPersistenceConfigState,
  type PersistenceConfigState,
  type UtopiaRepository,
} from "@utopia/db";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

const xpForLeadCreation = {
  sales: 0,
  delivery: 0,
  content: 0,
  systems: 10,
  relationships: 6,
  revenue: 0,
  discipline: 4,
} as const;

const scaleXpAwards = (
  xpAwards: typeof xpForLeadCreation,
  multiplier: number,
) => ({
  sales: xpAwards.sales * multiplier,
  delivery: xpAwards.delivery * multiplier,
  content: xpAwards.content * multiplier,
  systems: xpAwards.systems * multiplier,
  relationships: xpAwards.relationships * multiplier,
  revenue: xpAwards.revenue * multiplier,
  discipline: xpAwards.discipline * multiplier,
});

const xpForResearch = {
  sales: 36,
  delivery: 0,
  content: 0,
  systems: 12,
  relationships: 7,
  revenue: 8,
  discipline: 6,
} as const;

const zeroXp = {
  sales: 0,
  delivery: 0,
  content: 0,
  systems: 0,
  relationships: 0,
  revenue: 0,
  discipline: 0,
} as const;

const paramsSchema = z.object({
  leadId: z.string().trim().min(1),
});

const approvalParamsSchema = z.object({
  approvalId: z.string().trim().min(1),
});

const clientParamsSchema = z.object({
  clientId: z.string().trim().min(1),
});

const templateParamsSchema = z.object({
  templateId: z.string().trim().min(1),
});

type OwnerSource = "authenticated-user" | "env-fallback" | "memory-demo" | "none";

type AuthenticatedUser = {
  id: string;
};

type CreateAppOptions = {
  persistence?: PersistenceConfigState;
  verifyAccessToken?: (accessToken: string) => Promise<AuthenticatedUser | null>;
  createRepositoryForOwner?: (ownerId: string) => UtopiaRepository;
};

type AppContext = {
  Variables: {
    requestId: string;
    repository: UtopiaRepository;
    currentUserId: string | null;
    currentRequestAuthenticated: boolean;
    ownerSource: OwnerSource;
  };
};

const publicApiPaths = new Set(["/health", "/api/health", "/api/system/status"]);
const runtimeEnv =
  typeof process !== "undefined" && process.env
    ? (process.env as Record<string, string | undefined>)
    : {};
const createRequestId = () => globalThis.crypto.randomUUID();

const verifySupabaseUser = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  accessToken: string,
): Promise<AuthenticatedUser | null> => {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: serviceRoleKey,
    },
  });

  if (!response.ok) {
    console.error("Supabase auth verification failed", {
      status: response.status,
    });
    return null;
  }

  const payload = (await response.json()) as { id?: string | null };

  if (typeof payload.id !== "string" || payload.id.trim() === "") {
    return null;
  }

  return {
    id: payload.id,
  };
};

export const createApp = (
  repository: UtopiaRepository = createConfiguredUtopiaRepository(),
  options: CreateAppOptions = {},
) => {
  const app = new Hono<AppContext>();
  const agentStatus = getAgentConnectionStatus();
  const persistence = options.persistence ?? getPersistenceConfigState();
  const isDevelopment = runtimeEnv.NODE_ENV !== "production";
  const fallbackOwnerId =
    persistence.ownerConfigured && persistence.ownerIdFormatValid
      ? runtimeEnv.UTOPIA_OWNER_ID?.trim() ?? null
      : null;
  const supabaseUrl = runtimeEnv.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const adminClient =
    persistence.supabaseConfigured && !options.createRepositoryForOwner
      ? createSupabaseAdminClient()
      : null;
  const createRepositoryForOwner =
    options.createRepositoryForOwner ??
    ((ownerId: string) =>
      createSupabaseUtopiaRepository({
        client: adminClient ?? undefined,
        ownerId,
      }));
  const verifyAccessToken =
    options.verifyAccessToken ??
    (async (accessToken: string): Promise<AuthenticatedUser | null> => {
      if (!persistence.supabaseConfigured || !supabaseUrl || !serviceRoleKey) {
        return null;
      }

      return verifySupabaseUser(supabaseUrl, serviceRoleKey, accessToken);
    });
  const authRequired = repository.mode === "supabase";

  app.use(
    "*",
    cors({
      origin: runtimeEnv.WEB_ORIGIN?.split(",") ?? "*",
    }),
  );

  app.use("*", async (context, next) => {
    const requestId =
      context.req.header("x-request-id")?.trim() ||
      context.req.header("x-vercel-id")?.trim() ||
      createRequestId();
    context.set("requestId", requestId);
    context.header("x-request-id", requestId);
    await next();
  });

  app.use("*", (context, next) => {
    context.set("repository", repository);
    context.set("currentUserId", null);
    context.set("currentRequestAuthenticated", false);
    context.set(
      "ownerSource",
      repository.mode === "memory" ? "memory-demo" : fallbackOwnerId ? "env-fallback" : "none",
    );

    return next();
  });

  app.use("*", (async (context, next) => {
    const path = context.req.path;

    if (repository.mode === "memory") {
      context.set("repository", repository);
      context.set("ownerSource", "memory-demo");
      return next();
    }

    const authorization = context.req.header("authorization")?.trim() ?? "";
    const bearerPrefix = "Bearer ";
    const accessToken = authorization.startsWith(bearerPrefix)
      ? authorization.slice(bearerPrefix.length).trim()
      : "";

    if (accessToken) {
      const authenticatedUser = await verifyAccessToken(accessToken);

      if (authenticatedUser) {
        context.set("currentUserId", authenticatedUser.id);
        context.set("currentRequestAuthenticated", true);
        context.set("ownerSource", "authenticated-user");
        context.set("repository", createRepositoryForOwner(authenticatedUser.id));
        return next();
      }
    }

    if (publicApiPaths.has(path)) {
      if (fallbackOwnerId) {
        context.set("ownerSource", "env-fallback");
        context.set("repository", createRepositoryForOwner(fallbackOwnerId));
      }

      return next();
    }

    return context.json(
      {
        error: "Unauthorized",
        message: "Authentication required.",
        requestId: context.get("requestId"),
      },
      401,
    );
  }) as MiddlewareHandler<AppContext>);

  app.onError((error, context) => {
    const requestId = context.get("requestId");
    console.error("Utopia API request failed", {
      requestId,
      method: context.req.method,
      path: context.req.path,
      error,
    });

    return context.json(
      {
        error: "Internal Server Error",
        message:
          isDevelopment && error instanceof Error
            ? error.message
            : "The API request failed.",
        requestId,
      },
      500,
    );
  });

  app.notFound((context) => {
    if (context.req.path.startsWith("/api")) {
      return context.json(
        {
          error: "API route not found.",
          requestId: context.get("requestId"),
          path: context.req.path,
        },
        404,
      );
    }

    return context.json({ error: "Not found." }, 404);
  });

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "utopia-command-api",
      repositoryMode: context.get("repository").mode,
      agentMode: agentStatus.mode,
    }),
  );

  app.get("/api/health", (context) =>
    context.json({
      ok: true,
      service: "utopia-command-api",
      repositoryMode: context.get("repository").mode,
      agentMode: agentStatus.mode,
      supabaseConfigured: persistence.supabaseConfigured,
      ownerConfigured: persistence.ownerConfigured,
    }),
  );

  const getRepository = (context: Context<AppContext>) => context.get("repository");

  app.get("/api/dashboard", async (context) =>
    context.json(await getRepository(context).getDashboardSummary()),
  );

  app.get("/api/leads", async (context) =>
    context.json({
      leads: await getRepository(context).listLeads(),
      stats: await getRepository(context).listProgressStats(),
    }),
  );

  app.get("/api/approvals", async (context) =>
    context.json(
      approvalsResponseSchema.parse({
        approvals: await getRepository(context).listApprovals(),
      }),
    ),
  );

  app.get("/api/clients", async (context) =>
    context.json(
      clientsResponseSchema.parse({
        clients: await getRepository(context).listClients(),
      }),
    ),
  );

  app.get("/api/templates", async (context) =>
    context.json(
      templatesResponseSchema.parse({
        templates: await getRepository(context).listTemplates(),
      }),
    ),
  );

  app.get("/api/system/status", async (context) =>
    context.json(
      systemStatusSchema.parse({
        repositoryMode: context.get("repository").mode,
        supabaseUrlConfigured: persistence.supabaseUrlConfigured,
        serviceRoleConfigured: persistence.serviceRoleConfigured,
        supabaseConfigured: persistence.supabaseConfigured,
        persistenceEnabled: repository.mode === "supabase",
        ownerConfigured: persistence.ownerConfigured,
        ownerIdFormatValid: persistence.ownerIdFormatValid,
        authRequired,
        currentRequestAuthenticated: context.get("currentRequestAuthenticated"),
        ownerSource: context.get("ownerSource"),
        agentCommandConfigured: agentStatus.configured,
        agentCommandPreview: agentStatus.commandPreview,
        agentMode: agentStatus.mode,
        schemaCheck: (await context.get("repository").getSchemaCheck()) ?? undefined,
      }),
    ),
  );

  app.get(
    "/api/leads/:leadId",
    zValidator("param", paramsSchema),
    async (context) => {
      const { leadId } = context.req.valid("param");
      const lead = await getRepository(context).getLead(leadId);

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      return context.json({ lead });
    },
  );

  app.post(
    "/api/leads",
    zValidator("json", createLeadInputSchema),
    async (context) => {
      const scopedRepository = getRepository(context);
      const lead = await scopedRepository.createLead(context.req.valid("json"));
      const stats = await scopedRepository.awardXp(xpForLeadCreation);
      const activity = await scopedRepository.createActivity({
        entityType: "lead",
        entityId: lead.id,
        kind: "lead.created",
        actor: "human",
        message: `Lead created for ${lead.company}.`,
        xpAwards: xpForLeadCreation,
      });

      return context.json(
        createLeadResponseSchema.parse({
          lead,
          activity,
          stats,
        }),
        201,
      );
    },
  );

  app.post(
    "/api/leads/import",
    zValidator("json", importLeadsInputSchema),
    async (context) => {
      const { leads: inputLeads } = context.req.valid("json");
      const scopedRepository = getRepository(context);
      const leads = [];

      for (const input of inputLeads) {
        leads.push(await scopedRepository.createLead(input));
      }

      const xpAwards = scaleXpAwards(xpForLeadCreation, leads.length);
      const stats = await scopedRepository.awardXp(xpAwards);
      const activity = await scopedRepository.createActivity({
        entityType: "lead",
        entityId: leads[0].id,
        kind: "lead.imported",
        actor: "human",
        message: `${leads.length} lead${leads.length === 1 ? "" : "s"} imported from CSV.`,
        xpAwards,
      });

      return context.json(
        importLeadsResponseSchema.parse({
          leads,
          activity,
          stats,
        }),
        201,
      );
    },
  );

  app.patch(
    "/api/leads/:leadId",
    zValidator("param", paramsSchema),
    zValidator("json", updateLeadInputSchema),
    async (context) => {
      const { leadId } = context.req.valid("param");
      const scopedRepository = getRepository(context);
      const lead = await scopedRepository.updateLead(leadId, context.req.valid("json"));

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      const activity = await scopedRepository.createActivity({
        entityType: "lead",
        entityId: lead.id,
        kind: "lead.updated",
        actor: "human",
        message: `Lead updated for ${lead.company}.`,
        xpAwards: zeroXp,
      });

      return context.json(
        updateLeadResponseSchema.parse({
          lead,
          activity,
        }),
      );
    },
  );

  app.post(
    "/api/leads/:leadId/promote",
    zValidator("param", paramsSchema),
    zValidator("json", promoteLeadToClientInputSchema),
    async (context) => {
      const { leadId } = context.req.valid("param");
      const scopedRepository = getRepository(context);
      const promoted = await scopedRepository.promoteLeadToClient(
        leadId,
        context.req.valid("json"),
      );

      if (!promoted) {
        return context.json({ error: "Lead not found." }, 404);
      }

      const activity = await scopedRepository.createActivity({
        entityType: "lead",
        entityId: promoted.lead.id,
        kind: "client.promoted",
        actor: "human",
        message: `${promoted.client.company} promoted into client delivery.`,
        xpAwards: zeroXp,
      });

      return context.json(
        clientResponseSchema.parse({
          ...promoted,
          activity,
        }),
        201,
      );
    },
  );

  app.post(
    "/api/leads/:leadId/research",
    zValidator("param", paramsSchema),
    async (context) => {
      const { leadId } = context.req.valid("param");
      const scopedRepository = getRepository(context);
      const lead = await scopedRepository.getLead(leadId);

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      await scopedRepository.updateLeadStatus(leadId, "researching");

      const queuedRun = await scopedRepository.createAgentRun({
        action: "research_lead",
        mode: "mock",
        status: "running",
        summary: `Researching ${lead.company} for offer opportunities.`,
        targetType: "lead",
        targetId: leadId,
        requiresApproval: false,
        prompt:
          "Research the lead, extract likely buying signals, and suggest the next low-risk human action.",
      });

      try {
        const execution = await runResearchLeadAction(lead);
        const updatedLead = await scopedRepository.applyResearchToLead(
          leadId,
          execution.result,
        );

        if (!updatedLead) {
          return context.json({ error: "Lead not found after research." }, 404);
        }

        const completedRun = await scopedRepository.updateAgentRun(queuedRun.id, {
          mode: execution.mode,
          status: "completed",
          summary: `${updatedLead.company} researched with ${execution.result.opportunities.length} mapped opportunity angles.`,
          prompt: execution.prompt,
          completedAt: new Date().toISOString(),
          error: execution.error,
        });

        const stats = await scopedRepository.awardXp(xpForResearch);
        const activity = await scopedRepository.createActivity({
          entityType: "lead",
          entityId: leadId,
          kind: "lead.researched",
          actor: "agent",
          message: `Research completed for ${updatedLead.company}.`,
          xpAwards: xpForResearch,
        });

        await scopedRepository.createActivity({
          entityType: "agent_run",
          entityId: queuedRun.id,
          kind: "agent.run.completed",
          actor: "system",
          message: `${execution.mode === "openclaw-cli" ? "OpenClaw" : "Fallback research"} run completed for ${updatedLead.company}.`,
          xpAwards: {
            sales: 0,
            delivery: 0,
            content: 0,
            systems: 0,
            relationships: 0,
            revenue: 0,
            discipline: 0,
          },
        });

        return context.json(
          researchLeadResponseSchema.parse({
            lead: updatedLead,
            activity,
            agentRun: completedRun ?? queuedRun,
            stats,
          }),
        );
      } catch (error) {
        const failedRun = await scopedRepository.updateAgentRun(queuedRun.id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown research error",
          summary: `Research failed for ${lead.company}.`,
        });

        return context.json(
          {
            error: "Lead research failed.",
            agentRun: failedRun ?? queuedRun,
          },
          500,
        );
      }
    },
  );

  app.post(
    "/api/approvals",
    zValidator("json", requestApprovalInputSchema),
    async (context) => {
      const scopedRepository = getRepository(context);
      const approval = await scopedRepository.createApproval(context.req.valid("json"));
      const activity = await scopedRepository.createActivity({
        entityType: approval.targetType === "lead" ? "lead" : "system",
        entityId: approval.targetId,
        kind: "approval.requested",
        actor: "human",
        message: `Approval requested: ${approval.title}.`,
        xpAwards: zeroXp,
      });

      return context.json(
        approvalResponseSchema.parse({
          approval,
          activity,
        }),
        201,
      );
    },
  );

  app.post(
    "/api/approvals/:approvalId/resolve",
    zValidator("param", approvalParamsSchema),
    zValidator("json", resolveApprovalInputSchema),
    async (context) => {
      const { approvalId } = context.req.valid("param");
      const { decision } = context.req.valid("json");
      const scopedRepository = getRepository(context);
      const approval = await scopedRepository.resolveApproval(approvalId, decision);

      if (!approval) {
        return context.json({ error: "Approval not found." }, 404);
      }

      const activity = await scopedRepository.createActivity({
        entityType: approval.targetType === "lead" ? "lead" : "system",
        entityId: approval.targetId,
        kind: `approval.${decision}`,
        actor: "human",
        message: `${approval.title} ${decision}.`,
        xpAwards: zeroXp,
      });

      return context.json(
        approvalResponseSchema.parse({
          approval,
          activity,
        }),
      );
    },
  );

  app.patch(
    "/api/clients/:clientId",
    zValidator("param", clientParamsSchema),
    zValidator("json", updateClientInputSchema),
    async (context) => {
      const { clientId } = context.req.valid("param");
      const scopedRepository = getRepository(context);
      const client = await scopedRepository.updateClient(clientId, context.req.valid("json"));

      if (!client) {
        return context.json({ error: "Client not found." }, 404);
      }

      const activity = await scopedRepository.createActivity({
        entityType: "system",
        entityId: client.id,
        kind: "client.updated",
        actor: "human",
        message: `${client.company} client record updated.`,
        xpAwards: zeroXp,
      });

      return context.json(
        clientResponseSchema.parse({
          client,
          activity,
        }),
      );
    },
  );

  app.post(
    "/api/templates",
    zValidator("json", createTemplateInputSchema),
    async (context) => {
      const scopedRepository = getRepository(context);
      const template = await scopedRepository.createTemplate(context.req.valid("json"));
      const activity = await scopedRepository.createActivity({
        entityType: "system",
        entityId: template.id,
        kind: "template.created",
        actor: "human",
        message: `${template.title} added to the vault.`,
        xpAwards: zeroXp,
      });

      return context.json(
        templateResponseSchema.parse({
          template,
          activity,
        }),
        201,
      );
    },
  );

  app.patch(
    "/api/templates/:templateId",
    zValidator("param", templateParamsSchema),
    zValidator("json", updateTemplateInputSchema),
    async (context) => {
      const { templateId } = context.req.valid("param");
      const scopedRepository = getRepository(context);
      const template = await scopedRepository.updateTemplate(
        templateId,
        context.req.valid("json"),
      );

      if (!template) {
        return context.json({ error: "Template not found." }, 404);
      }

      const activity = await scopedRepository.createActivity({
        entityType: "system",
        entityId: template.id,
        kind: "template.updated",
        actor: "human",
        message: `${template.title} updated in the vault.`,
        xpAwards: zeroXp,
      });

      return context.json(
        templateResponseSchema.parse({
          template,
          activity,
        }),
      );
    },
  );

  return app;
};
