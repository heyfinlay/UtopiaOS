import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalTrimmedString = z.string().trim().min(2).optional();
const optionalUrlString = z.string().trim().url().optional();

const optionalTrimmedInputString = z.preprocess(
  emptyToUndefined,
  optionalTrimmedString,
);

const optionalUrlInputString = z.preprocess(emptyToUndefined, optionalUrlString);

export const statKeySchema = z.enum([
  "sales",
  "delivery",
  "content",
  "systems",
  "relationships",
  "revenue",
  "discipline",
]);

export type StatKey = z.infer<typeof statKeySchema>;

export const leadStatusSchema = z.enum([
  "new",
  "researching",
  "qualified",
  "proposal",
  "won",
  "lost",
]);

export const leadPrioritySchema = z.enum(["critical", "high", "normal"]);

export const agentRunStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "approval_required",
]);

export const agentRunModeSchema = z.enum([
  "mock",
  "mock-fallback",
  "openclaw-cli",
]);

export const researchOpportunitySchema = z.object({
  title: z.string().trim().min(2),
  reason: z.string().trim().min(2),
  confidence: z.number().int().min(0).max(100),
});

export const researchLeadResultSchema = z.object({
  overview: z.string().trim().min(24),
  companySnapshot: z.string().trim().min(16),
  icpFit: z.string().trim().min(12),
  buyingSignals: z.array(z.string().trim().min(2)).min(2).max(5),
  opportunities: z.array(researchOpportunitySchema).min(1).max(4),
  recommendedOffer: z.string().trim().min(8),
  nextAction: z.string().trim().min(8),
  riskFlags: z.array(z.string().trim().min(2)).max(4),
  confidence: z.number().int().min(0).max(100),
  sources: z.array(z.string().trim().min(2)).min(1).max(5),
});

export type ResearchLeadResult = z.infer<typeof researchLeadResultSchema>;

export const leadSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2),
  company: z.string().trim().min(2),
  website: optionalUrlString,
  source: optionalTrimmedString,
  priority: leadPrioritySchema,
  status: leadStatusSchema,
  notes: optionalTrimmedString,
  nextAction: optionalTrimmedString,
  research: researchLeadResultSchema.optional(),
  lastResearchedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Lead = z.infer<typeof leadSchema>;

export const createLeadInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(120),
  website: optionalUrlInputString,
  source: optionalTrimmedInputString,
  priority: leadPrioritySchema.default("normal"),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;

export const activitySchema = z.object({
  id: z.string().trim().min(1),
  entityType: z.enum(["lead", "agent_run", "system"]),
  entityId: z.string().trim().min(1),
  kind: z.string().trim().min(2),
  actor: z.enum(["human", "agent", "system"]),
  message: z.string().trim().min(2),
  xpAwards: z.record(statKeySchema, z.number().int().nonnegative()),
  createdAt: z.string().datetime(),
});

export type Activity = z.infer<typeof activitySchema>;

export const agentRunSchema = z.object({
  id: z.string().trim().min(1),
  action: z.literal("research_lead"),
  mode: agentRunModeSchema,
  status: agentRunStatusSchema,
  summary: z.string().trim().min(2),
  targetType: z.literal("lead"),
  targetId: z.string().trim().min(1),
  requiresApproval: z.boolean(),
  prompt: z.string().trim().min(8),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: optionalTrimmedString,
});

export type AgentRun = z.infer<typeof agentRunSchema>;

export const missionSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  statKey: statKeySchema,
  xpReward: z.number().int().nonnegative(),
  completed: z.boolean(),
  progressLabel: z.string().trim().min(2),
});

export type Mission = z.infer<typeof missionSchema>;

export const progressStatSchema = z.object({
  key: statKeySchema,
  label: z.string().trim().min(2),
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  progress: z.number().min(0).max(1),
  nextLevelAt: z.number().int().positive(),
});

export type ProgressStat = z.infer<typeof progressStatSchema>;

export const pipelineMetricSchema = z.object({
  label: z.string().trim().min(2),
  value: z.number().int().nonnegative(),
  trend: z.string().trim().min(2),
});

export const mainQuestSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  xpReward: z.number().int().nonnegative(),
});

export const dashboardSummarySchema = z.object({
  generatedAt: z.string().datetime(),
  mainQuest: mainQuestSchema,
  missions: z.array(missionSchema).min(1),
  pipeline: z.array(pipelineMetricSchema).min(1),
  stats: z.array(progressStatSchema).min(1),
  recentActivity: z.array(activitySchema),
  agentRuns: z.array(agentRunSchema),
  featuredLead: leadSchema.nullable(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const createLeadResponseSchema = z.object({
  lead: leadSchema,
  activity: activitySchema,
  stats: z.array(progressStatSchema),
});

export const researchLeadResponseSchema = z.object({
  lead: leadSchema,
  activity: activitySchema,
  agentRun: agentRunSchema,
  stats: z.array(progressStatSchema),
});

export type CreateLeadResponse = z.infer<typeof createLeadResponseSchema>;
export type ResearchLeadResponse = z.infer<typeof researchLeadResponseSchema>;
