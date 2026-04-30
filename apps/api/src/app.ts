import process from "node:process";

import { zValidator } from "@hono/zod-validator";
import { runResearchLeadAction } from "@utopia/agent-actions";
import {
  createLeadInputSchema,
  createLeadResponseSchema,
  researchLeadResponseSchema,
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

const xpForResearch = {
  sales: 36,
  delivery: 0,
  content: 0,
  systems: 12,
  relationships: 7,
  revenue: 8,
  discipline: 6,
} as const;

const paramsSchema = z.object({
  leadId: z.string().trim().min(1),
});

export const createApp = (repository: UtopiaRepository = utopiaRepository) => {
  const app = new Hono();

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
    }),
  );

  app.get("/api/dashboard", (context) =>
    context.json(repository.getDashboardSummary()),
  );

  app.get("/api/leads", (context) =>
    context.json({
      leads: repository.listLeads(),
      stats: repository.listProgressStats(),
    }),
  );

  app.get(
    "/api/leads/:leadId",
    zValidator("param", paramsSchema),
    (context) => {
      const { leadId } = context.req.valid("param");
      const lead = repository.getLead(leadId);

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      return context.json({ lead });
    },
  );

  app.post(
    "/api/leads",
    zValidator("json", createLeadInputSchema),
    (context) => {
      const lead = repository.createLead(context.req.valid("json"));
      const stats = repository.awardXp(xpForLeadCreation);
      const activity = repository.createActivity({
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
    "/api/leads/:leadId/research",
    zValidator("param", paramsSchema),
    async (context) => {
      const { leadId } = context.req.valid("param");
      const lead = repository.getLead(leadId);

      if (!lead) {
        return context.json({ error: "Lead not found." }, 404);
      }

      repository.updateLeadStatus(leadId, "researching");

      const queuedRun = repository.createAgentRun({
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
        const updatedLead = repository.applyResearchToLead(leadId, execution.result);

        if (!updatedLead) {
          return context.json({ error: "Lead not found after research." }, 404);
        }

        const completedRun = repository.updateAgentRun(queuedRun.id, {
          mode: execution.mode,
          status: "completed",
          summary: `${updatedLead.company} researched with ${execution.result.opportunities.length} mapped opportunity angles.`,
          prompt: execution.prompt,
          completedAt: new Date().toISOString(),
          error: execution.error,
        });

        const stats = repository.awardXp(xpForResearch);
        const activity = repository.createActivity({
          entityType: "lead",
          entityId: leadId,
          kind: "lead.researched",
          actor: "agent",
          message: `Research completed for ${updatedLead.company}.`,
          xpAwards: xpForResearch,
        });

        repository.createActivity({
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
        const failedRun = repository.updateAgentRun(queuedRun.id, {
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

  return app;
};
