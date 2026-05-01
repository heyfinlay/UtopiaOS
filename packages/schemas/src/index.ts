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
const optionalNonNegativeNumberInput = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative().optional(),
).optional();

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
  "openclaw-cli",
]);

export const repositoryModeSchema = z.literal("supabase");

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

export const commercialProfileInputSchema = z.object({
  pipelineValue: optionalNonNegativeNumberInput,
  weightedValue: optionalNonNegativeNumberInput,
  closedValue: optionalNonNegativeNumberInput,
  invoiceIssued: optionalNonNegativeNumberInput,
  invoiceOutstanding: optionalNonNegativeNumberInput,
  clientSavingsValue: optionalNonNegativeNumberInput,
  nextRevenueMilestone: optionalTrimmedInputString,
});

export const deliveryProfileInputSchema = z.object({
  stage: deliveryStageSchema.optional(),
  completionPercent: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(100).optional(),
  ).optional(),
  nextDeliverable: optionalTrimmedInputString,
  dueLabel: optionalTrimmedInputString,
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
});

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

export const updateLeadInputSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  company: z.string().trim().min(2).max(120).optional(),
  website: optionalUrlInputString,
  source: optionalTrimmedInputString,
  priority: leadPrioritySchema.optional(),
  status: leadStatusSchema.optional(),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ).optional(),
  nextAction: optionalTrimmedInputString,
  commercial: commercialProfileInputSchema.optional(),
  delivery: deliveryProfileInputSchema.optional(),
});

export type UpdateLeadInput = z.infer<typeof updateLeadInputSchema>;

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

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const approvalActionSchema = z.enum([
  "change_lead_status",
  "promote_client",
  "send_outbound",
  "update_pricing",
]);

export const approvalSchema = z.object({
  id: z.string().trim().min(1),
  action: approvalActionSchema,
  status: approvalStatusSchema,
  targetType: z.enum(["lead", "client"]),
  targetId: z.string().trim().min(1),
  title: z.string().trim().min(2),
  summary: z.string().trim().min(2),
  requestedBy: z.enum(["human", "agent", "system"]),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});

export type Approval = z.infer<typeof approvalSchema>;

export const requestApprovalInputSchema = z.object({
  action: approvalActionSchema,
  targetType: z.enum(["lead", "client"]),
  targetId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(2).max(500),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type RequestApprovalInput = z.infer<typeof requestApprovalInputSchema>;

export const resolveApprovalInputSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export type ResolveApprovalInput = z.infer<typeof resolveApprovalInputSchema>;

export const clientStatusSchema = z.enum(["active", "paused", "completed"]);

export const clientSchema = z.object({
  id: z.string().trim().min(1),
  leadId: z.string().trim().min(1).optional(),
  company: z.string().trim().min(2),
  status: clientStatusSchema,
  auditNotes: z.array(z.string().trim().min(2)),
  deliveryRoadmap: z.array(z.string().trim().min(2)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Client = z.infer<typeof clientSchema>;

export const promoteLeadToClientInputSchema = z.object({
  auditNote: optionalTrimmedInputString,
  roadmapItem: optionalTrimmedInputString,
});

export type PromoteLeadToClientInput = z.infer<typeof promoteLeadToClientInputSchema>;

export const updateClientInputSchema = z.object({
  status: clientStatusSchema.optional(),
  auditNote: optionalTrimmedInputString,
  roadmapItem: optionalTrimmedInputString,
});

export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;

export const templateSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(2),
  category: z.string().trim().min(2),
  body: z.string().trim().min(8),
  version: z.number().int().positive(),
  archived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Template = z.infer<typeof templateSchema>;

export const createTemplateInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  body: z.string().trim().min(8).max(5_000),
});

export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;

export const updateTemplateInputSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  body: z.string().trim().min(8).max(5_000).optional(),
  archived: z.boolean().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;

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
  approvals: z.array(approvalSchema),
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

export const updateLeadResponseSchema = z.object({
  lead: leadSchema,
  activity: activitySchema,
});

export const researchLeadResponseSchema = z.object({
  lead: leadSchema,
  activity: activitySchema,
  agentRun: agentRunSchema,
  stats: z.array(progressStatSchema),
});

export const approvalsResponseSchema = z.object({
  approvals: z.array(approvalSchema),
});

export const approvalResponseSchema = z.object({
  approval: approvalSchema,
  activity: activitySchema,
});

export const clientsResponseSchema = z.object({
  clients: z.array(clientSchema),
});

export const clientResponseSchema = z.object({
  client: clientSchema,
  lead: leadSchema.optional(),
  activity: activitySchema,
});

export const templatesResponseSchema = z.object({
  templates: z.array(templateSchema),
});

export const templateResponseSchema = z.object({
  template: templateSchema,
  activity: activitySchema,
});

export const systemSchemaCheckSchema = z.object({
  ok: z.boolean(),
  missing: z.array(z.string()),
});

export const ownerSourceSchema = z.enum([
  "authenticated-user",
  "none",
]);

export const systemStatusSchema = z.object({
  repositoryMode: repositoryModeSchema,
  supabaseUrlConfigured: z.boolean(),
  serviceRoleConfigured: z.boolean(),
  supabaseConfigured: z.boolean(),
  persistenceEnabled: z.boolean(),
  authRequired: z.boolean(),
  currentRequestAuthenticated: z.boolean(),
  ownerSource: ownerSourceSchema,
  agentCommandConfigured: z.boolean(),
  agentCommandPreview: z.string(),
  agentMode: z.enum(["mock", "openclaw-cli"]),
  schemaCheck: systemSchemaCheckSchema.optional(),
});

export type CreateLeadResponse = z.infer<typeof createLeadResponseSchema>;
export type ImportLeadsResponse = z.infer<typeof importLeadsResponseSchema>;
export type UpdateLeadResponse = z.infer<typeof updateLeadResponseSchema>;
export type ResearchLeadResponse = z.infer<typeof researchLeadResponseSchema>;
export type ApprovalsResponse = z.infer<typeof approvalsResponseSchema>;
export type ApprovalResponse = z.infer<typeof approvalResponseSchema>;
export type ClientsResponse = z.infer<typeof clientsResponseSchema>;
export type ClientResponse = z.infer<typeof clientResponseSchema>;
export type TemplatesResponse = z.infer<typeof templatesResponseSchema>;
export type TemplateResponse = z.infer<typeof templateResponseSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
