import process from "node:process";

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
import { type UtopiaRepository, utopiaRepository } from "@utopia/db";
import { Hono } from "hono";
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

export const createApp = (repository: UtopiaRepository = utopiaRepository) => {
  const app = new Hono();
  const agentStatus = getAgentConnectionStatus();
  const hasSupabaseEnv = Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const hasOwnerEnv = Boolean(process.env.UTOPIA_OWNER_ID?.trim());

  app.use(
    "*",
    cors({
      origin: process.env.WEB_ORIGIN?.split(",") ?? "*",
    }),
  );

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "utopia-command-api",
      repositoryMode: repository.mode,
      agentMode: agentStatus.mode,
    }),
  );

  app.get("/api/dashboard", async (context) =>
    context.json(await repository.getDashboardSummary()),
  );

  app.get("/api/leads", async (context) =>
    context.json({
      leads: await repository.listLeads(),
      stats: await repository.listProgressStats(),
    }),
  );

  app.get("/api/approvals", async (context) =>
    context.json(
      approvalsResponseSchema.parse({
        approvals: await repository.listApprovals(),
      }),
    ),
  );

  app.get("/api/clients", async (context) =>
    context.json(
      clientsResponseSchema.parse({
        clients: await repository.listClients(),
      }),
    ),
  );

  app.get("/api/templates", async (context) =>
    context.json(
      templatesResponseSchema.parse({
        templates: await repository.listTemplates(),
      }),
    ),
  );

  app.get("/api/system/status", (context) =>
    context.json(
      systemStatusSchema.parse({
        repositoryMode: repository.mode,
        supabaseConfigured: hasSupabaseEnv,
        persistenceEnabled: repository.mode === "supabase",
        ownerConfigured: hasOwnerEnv,
        agentCommandConfigured: agentStatus.configured,
        agentCommandPreview: agentStatus.commandPreview,
        agentMode: agentStatus.mode,
      }),
    ),
  );

  app.get(
    "/api/leads/:leadId",
    zValidator("param", paramsSchema),
    async (context) => {
      const { leadId } = context.req.valid("param");
      const lead = await repository.getLead(leadId);

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
      const lead = await repository.createLead(context.req.valid("json"));
      const stats = await repository.awardXp(xpForLeadCreation);
      const activity = await repository.createActivity({
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
      const leads = [];

      for (const input of inputLeads) {
        leads.push(await repository.createLead(input));
      }

      const xpAwards = scaleXpAwards(xpForLeadCreation, leads.length);
      const stats = await repository.awardXp(xpAwards);
      const activity = await repository.createActivity({
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
      const lead = await repository.updateLead(leadId, context.req.valid("json"));

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      const activity = await repository.createActivity({
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
      const promoted = await repository.promoteLeadToClient(
        leadId,
        context.req.valid("json"),
      );

      if (!promoted) {
        return context.json({ error: "Lead not found." }, 404);
      }

      const activity = await repository.createActivity({
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
      const lead = await repository.getLead(leadId);

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      await repository.updateLeadStatus(leadId, "researching");

      const queuedRun = await repository.createAgentRun({
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
        const updatedLead = await repository.applyResearchToLead(
          leadId,
          execution.result,
        );

        if (!updatedLead) {
          return context.json({ error: "Lead not found after research." }, 404);
        }

        const completedRun = await repository.updateAgentRun(queuedRun.id, {
          mode: execution.mode,
          status: "completed",
          summary: `${updatedLead.company} researched with ${execution.result.opportunities.length} mapped opportunity angles.`,
          prompt: execution.prompt,
          completedAt: new Date().toISOString(),
          error: execution.error,
        });

        const stats = await repository.awardXp(xpForResearch);
        const activity = await repository.createActivity({
          entityType: "lead",
          entityId: leadId,
          kind: "lead.researched",
          actor: "agent",
          message: `Research completed for ${updatedLead.company}.`,
          xpAwards: xpForResearch,
        });

        await repository.createActivity({
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
        const failedRun = await repository.updateAgentRun(queuedRun.id, {
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
      const approval = await repository.createApproval(context.req.valid("json"));
      const activity = await repository.createActivity({
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
      const approval = await repository.resolveApproval(approvalId, decision);

      if (!approval) {
        return context.json({ error: "Approval not found." }, 404);
      }

      const activity = await repository.createActivity({
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
      const client = await repository.updateClient(clientId, context.req.valid("json"));

      if (!client) {
        return context.json({ error: "Client not found." }, 404);
      }

      const activity = await repository.createActivity({
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
      const template = await repository.createTemplate(context.req.valid("json"));
      const activity = await repository.createActivity({
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
      const template = await repository.updateTemplate(
        templateId,
        context.req.valid("json"),
      );

      if (!template) {
        return context.json({ error: "Template not found." }, 404);
      }

      const activity = await repository.createActivity({
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
