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
).optional();

const optionalUrlInputString = z.preprocess(emptyToUndefined, optionalUrlString).optional();

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

export const repositoryModeSchema = z.enum(["memory", "supabase"]);

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

export const deliveryStageSchema = z.enum([
  "backlog",
  "scoping",
  "implementation",
  "handoff",
  "retainer",
]);

export const commercialProfileSchema = z.object({
  pipelineValue: z.number().nonnegative(),
  weightedValue: z.number().nonnegative(),
  closedValue: z.number().nonnegative(),
  invoiceIssued: z.number().nonnegative(),
  invoiceOutstanding: z.number().nonnegative(),
  clientSavingsValue: z.number().nonnegative(),
  nextRevenueMilestone: z.string().trim().min(2),
});

export type CommercialProfile = z.infer<typeof commercialProfileSchema>;

export const deliveryProfileSchema = z.object({
  stage: deliveryStageSchema,
  completionPercent: z.number().min(0).max(100),
  nextDeliverable: z.string().trim().min(2),
  dueLabel: z.string().trim().min(2),
  riskLevel: z.enum(["low", "medium", "high"]),
});

export type DeliveryProfile = z.infer<typeof deliveryProfileSchema>;

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
  commercial: commercialProfileSchema.optional(),
  delivery: deliveryProfileSchema.optional(),
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
  ).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;

export const importLeadsInputSchema = z.object({
  leads: z.array(createLeadInputSchema).min(1).max(250),
});

export type ImportLeadsInput = z.infer<typeof importLeadsInputSchema>;

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

export const financeMetricSchema = z.object({
  label: z.string().trim().min(2),
  amount: z.number().nonnegative(),
  changeLabel: z.string().trim().min(2),
  tone: z.enum(["success", "warning", "neutral"]),
});

export type FinanceMetric = z.infer<typeof financeMetricSchema>;

export const actionItemSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  href: z.string().trim().min(1),
  emphasis: z.enum(["revenue", "delivery", "pipeline", "ops"]),
  valueLabel: z.string().trim().min(1),
});

export type ActionItem = z.infer<typeof actionItemSchema>;

export const revenueDashboardSchema = z.object({
  target: z.number().nonnegative(),
  collected: z.number().nonnegative(),
  outstanding: z.number().nonnegative(),
  pipeline: z.number().nonnegative(),
  weightedPipeline: z.number().nonnegative(),
  clientSavings: z.number().nonnegative(),
  progress: z.number().min(0).max(1),
  headline: z.string().trim().min(2),
  financeMetrics: z.array(financeMetricSchema).min(3),
});

export type RevenueDashboard = z.infer<typeof revenueDashboardSchema>;

export const deliveryDashboardSchema = z.object({
  activeCount: z.number().int().nonnegative(),
  dueSoonCount: z.number().int().nonnegative(),
  atRiskCount: z.number().int().nonnegative(),
  nextPayoutLabel: z.string().trim().min(2),
  highlightedAccounts: z.array(leadSchema).max(4),
});

export type DeliveryDashboard = z.infer<typeof deliveryDashboardSchema>;

export const mainQuestSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  xpReward: z.number().int().nonnegative(),
});

export const dashboardSummarySchema = z.object({
  generatedAt: z.string().datetime(),
  mainQuest: mainQuestSchema,
  revenue: revenueDashboardSchema,
  actionItems: z.array(actionItemSchema).min(1),
  delivery: deliveryDashboardSchema,
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

export const importLeadsResponseSchema = z.object({
  leads: z.array(leadSchema),
  activity: activitySchema,
  stats: z.array(progressStatSchema),
});

export const researchLeadResponseSchema = z.object({
  lead: leadSchema,
  activity: activitySchema,
  agentRun: agentRunSchema,
  stats: z.array(progressStatSchema),
});

export const systemStatusSchema = z.object({
  repositoryMode: repositoryModeSchema,
  supabaseConfigured: z.boolean(),
  persistenceEnabled: z.boolean(),
  ownerConfigured: z.boolean(),
  agentCommandConfigured: z.boolean(),
  agentCommandPreview: z.string(),
  agentMode: z.enum(["mock", "openclaw-cli"]),
});

export type CreateLeadResponse = z.infer<typeof createLeadResponseSchema>;
export type ImportLeadsResponse = z.infer<typeof importLeadsResponseSchema>;
export type ResearchLeadResponse = z.infer<typeof researchLeadResponseSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
