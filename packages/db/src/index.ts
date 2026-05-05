import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  activitySchema,
  agentRunSchema,
  dashboardSummarySchema,
  type Activity,
  type AgentRun,
  type Approval,
  type Client,
  type CreateLeadInput,
  type CreateTemplateInput,
  type DashboardSummary,
  type Lead,
  type Mission,
  type ProgressStat,
  type RequestApprovalInput,
  type ResearchLeadResult,
  type StatKey,
  type Template,
  type UpdateClientInput,
  type UpdateLeadInput,
  type UpdateTemplateInput,
  leadSchema,
  approvalSchema,
  clientSchema,
  researchLeadResultSchema,
  templateSchema,
} from "@utopia/schemas";

const statLabels: Record<StatKey, string> = {
  sales: "Sales",
  delivery: "Delivery",
  content: "Content",
  systems: "Systems",
  relationships: "Relationships",
  revenue: "Revenue",
  discipline: "Discipline",
};

type StatXpMap = Record<StatKey, number>;

type UtopiaState = {
  leads: Lead[];
  clients: Client[];
  approvals: Approval[];
  templates: Template[];
  activities: Activity[];
  agentRuns: AgentRun[];
  statXp: StatXpMap;
};

export type CreateAgentRunInput = Omit<AgentRun, "id" | "startedAt"> & {
  id?: string;
  startedAt?: string;
};

export type CreateActivityInput = Omit<Activity, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type UtopiaRepository = {
  mode: "memory" | "supabase";
  reset: () => Promise<void>;
  getSchemaCheck: () => Promise<SchemaCheckResult | null>;
  getDashboardSummary: () => Promise<DashboardSummary>;
  listProgressStats: () => Promise<ProgressStat[]>;
  listLeads: () => Promise<Lead[]>;
  getLead: (leadId: string) => Promise<Lead | null>;
  createLead: (input: CreateLeadInput) => Promise<Lead>;
  createLeadWithActivity: (input: {
    lead: CreateLeadInput;
    activity: CreateActivityInput;
    xpAwards: Partial<StatXpMap>;
  }) => Promise<{ lead: Lead; activity: Activity; stats: ProgressStat[] }>;
  updateLead: (leadId: string, input: UpdateLeadInput) => Promise<Lead | null>;
  updateLeadWithActivity: (input: {
    leadId: string;
    patch: UpdateLeadInput;
    activity: Omit<CreateActivityInput, "entityId">;
  }) => Promise<{ lead: Lead; activity: Activity } | null>;
  updateLeadStatus: (leadId: string, status: Lead["status"]) => Promise<Lead | null>;
  applyResearchToLead: (
    leadId: string,
    research: ResearchLeadResult,
  ) => Promise<Lead | null>;
  awardXp: (xpAwards: Partial<StatXpMap>) => Promise<ProgressStat[]>;
  createActivity: (input: CreateActivityInput) => Promise<Activity>;
  createAgentRun: (input: CreateAgentRunInput) => Promise<AgentRun>;
  updateAgentRun: (
    runId: string,
    updates: Partial<AgentRun>,
  ) => Promise<AgentRun | null>;
  startLeadResearchRun: (input: {
    leadId: string;
    run: CreateAgentRunInput;
  }) => Promise<{ lead: Lead; agentRun: AgentRun } | null>;
  completeLeadResearch: (input: {
    leadId: string;
    runId: string;
    research: ResearchLeadResult;
    leadStatusOnComplete?: Lead["status"];
    runUpdates: Partial<AgentRun>;
    activity: CreateActivityInput;
    xpAwards: Partial<StatXpMap>;
  }) => Promise<{ lead: Lead; agentRun: AgentRun; activity: Activity; stats: ProgressStat[] } | null>;
  failLeadResearch: (input: {
    leadId: string;
    runId: string;
    restoreStatus: Lead["status"];
    runUpdates: Partial<AgentRun>;
    activity?: CreateActivityInput;
  }) => Promise<{ lead: Lead | null; agentRun: AgentRun | null; activity?: Activity }>;
  listApprovals: () => Promise<Approval[]>;
  createApproval: (input: RequestApprovalInput) => Promise<Approval>;
  resolveApproval: (
    approvalId: string,
    decision: "approved" | "rejected",
  ) => Promise<Approval | null>;
  listClients: () => Promise<Client[]>;
  promoteLeadToClient: (
    leadId: string,
    input?: { auditNote?: string; roadmapItem?: string },
  ) => Promise<{ client: Client; lead: Lead } | null>;
  promoteLeadWithActivity: (input: {
    leadId: string;
    promotion?: { auditNote?: string; roadmapItem?: string };
    activity: Omit<CreateActivityInput, "entityId">;
  }) => Promise<{ client: Client; lead: Lead; activity: Activity } | null>;
  updateClient: (clientId: string, input: UpdateClientInput) => Promise<Client | null>;
  listTemplates: () => Promise<Template[]>;
  createTemplate: (input: CreateTemplateInput) => Promise<Template>;
  updateTemplate: (
    templateId: string,
    input: UpdateTemplateInput,
  ) => Promise<Template | null>;
};

type SupabaseRepositoryOptions = {
  client?: SupabaseClient;
  ownerId?: string;
};

type LeadRow = {
  id: string;
  name: string;
  company: string;
  website: string | null;
  source: string | null;
  priority: Lead["priority"];
  status: Lead["status"];
  notes: string | null;
  next_action: string | null;
  research_payload: unknown;
  commercial_profile: unknown;
  delivery_profile: unknown;
  last_researched_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  entity_type: "lead" | "agent_run" | "system";
  entity_id: string;
  kind: string;
  actor: "human" | "agent" | "system";
  message: string;
  xp_awards: unknown;
  created_at: string;
};

type AgentRunRow = {
  id: string;
  action: "research_lead";
  mode: "mock" | "openclaw-cli";
  status: AgentRun["status"];
  summary: string | null;
  target_type: "lead";
  target_id: string;
  requires_approval: boolean;
  prompt: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
};

type ApprovalRow = {
  id: string;
  action: Approval["action"];
  status: Approval["status"];
  target_type: Approval["targetType"];
  target_id: string;
  title: string;
  summary: string;
  requested_by: Approval["requestedBy"];
  payload: unknown;
  created_at: string;
  resolved_at: string | null;
};

type ClientRow = {
  id: string;
  lead_id: string | null;
  company: string;
  status: Client["status"];
  audit_notes: unknown;
  delivery_roadmap: unknown;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: string;
  title: string;
  category: string;
  body: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type ProgressionStatsRow = {
  owner_id: string;
  sales: number;
  delivery: number;
  content: number;
  systems: number;
  relationships: number;
  revenue: number;
  discipline: number;
};

export type PersistenceConfigState = {
  supabaseUrlConfigured: boolean;
  serviceRoleConfigured: boolean;
  supabaseConfigured: boolean;
  ownerConfigured: boolean;
  ownerIdFormatValid: boolean;
  persistenceEnabled: boolean;
};

export type SchemaCheckResult = {
  ok: boolean;
  missing: string[];
};

const defaultSupabaseTimeoutMs = 8_000;
const optionalSideEffectTimeoutMs = 4_000;
const leadSelectColumns =
  "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at";

export const withTimeout = async <T>(
  label: string,
  promise: PromiseLike<T>,
  timeoutMs = defaultSupabaseTimeoutMs,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      reject(new Error(`Supabase operation timed out: ${label}`));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timeout);
        reject(error);
      },
    );
  });

type AbortableSupabaseQuery<T> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
};

export const withAbortableTimeout = async <T>(
  label: string,
  query: AbortableSupabaseQuery<T>,
  timeoutMs = defaultSupabaseTimeoutMs,
): Promise<T> => {
  const controller = new AbortController();
  let timedOut = false;
  const abortableQuery =
    typeof query.abortSignal === "function"
      ? query.abortSignal(controller.signal)
      : query;

  return new Promise<T>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error(`Supabase operation timed out: ${label}`));
    }, timeoutMs);

    Promise.resolve(abortableQuery).then(
      (value) => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timeout);
        reject(
          timedOut
            ? new Error(`Supabase operation timed out: ${label}`)
            : error,
        );
      },
    );
  });
};

const isSupabaseTimeoutError = (error: unknown) =>
  error instanceof Error &&
  error.message.startsWith("Supabase operation timed out:");

const logLeadCreate = (
  event: string,
  metadata: Record<string, string | number | boolean | undefined> = {},
) => {
  console.info(event, metadata);
};

const logLeadCreateSideEffectFailure = (
  event: string,
  error: unknown,
  metadata: Record<string, string | number | boolean | undefined> = {},
) => {
  console.error(event, {
    ...metadata,
    error: error instanceof Error ? error.message : String(error),
  });
};

type EnvShape = Record<string, string | undefined>;

const runtimeEnv: EnvShape =
  typeof process !== "undefined" && process.env
    ? (process.env as EnvShape)
    : {};

const createUuid = () => globalThis.crypto.randomUUID();

const zeroXp = (): StatXpMap => ({
  sales: 0,
  delivery: 0,
  content: 0,
  systems: 0,
  relationships: 0,
  revenue: 0,
  discipline: 0,
});

export const createSupabaseAdminClient = (
  supabaseUrl = runtimeEnv.SUPABASE_URL,
  supabaseServiceRoleKey = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY,
) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for the admin client.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getPersistenceConfigState = (
  env: EnvShape = runtimeEnv,
): PersistenceConfigState => {
  const supabaseUrlConfigured = Boolean(env.SUPABASE_URL?.trim());
  const serviceRoleConfigured = Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const ownerId = env.UTOPIA_OWNER_ID?.trim();
  const ownerConfigured = Boolean(ownerId);
  const ownerIdFormatValid = Boolean(ownerId && uuidPattern.test(ownerId));
  const supabaseConfigured = supabaseUrlConfigured && serviceRoleConfigured;

  return {
    supabaseUrlConfigured,
    serviceRoleConfigured,
    supabaseConfigured,
    ownerConfigured,
    ownerIdFormatValid,
    persistenceEnabled: supabaseConfigured,
  };
};

const getMissingPersistenceEnvVars = (config: PersistenceConfigState) => {
  const missing: string[] = [];

  if (!config.supabaseUrlConfigured) {
    missing.push("SUPABASE_URL");
  }

  if (!config.serviceRoleConfigured) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return missing;
};

const logRowParseError = (entity: string, row: { id?: string }, error: unknown) => {
  console.error(`Failed to parse ${entity} row`, {
    entity,
    rowId: row.id,
    error,
    row,
  });
};

const safeMapRows = <TRow extends { id?: string }, TValue>(
  entity: string,
  rows: TRow[],
  parser: (row: TRow) => TValue,
) =>
  rows.flatMap((row) => {
    try {
      return [parser(row)];
    } catch (error) {
      logRowParseError(entity, row, error);
      return [];
    }
  });

const priorityWeight: Record<Lead["priority"], number> = {
  critical: 3,
  high: 2,
  normal: 1,
};

const nowIso = () => new Date().toISOString();

const compact = (parts: Array<string | undefined>) => parts.filter(Boolean).join(" ");
const cashTarget = 30_000;

const sortLeads = (leads: Lead[]) =>
  [...leads].sort((a, b) => {
    const priorityDelta = priorityWeight[b.priority] - priorityWeight[a.priority];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });

const buildProgressStat = (key: StatKey, xp: number): ProgressStat => {
  const levelSize = 120;
  const level = Math.floor(xp / levelSize) + 1;
  const nextLevelAt = level * levelSize;
  const progress = (xp % levelSize) / levelSize;

  return {
    key,
    label: statLabels[key],
    xp,
    level,
    progress,
    nextLevelAt,
  };
};

const createDefaultCommercialProfile = (priority: Lead["priority"]) => {
  if (priority === "critical") {
    return {
      pipelineValue: 16_000,
      weightedValue: 10_500,
      closedValue: 0,
      invoiceIssued: 0,
      invoiceOutstanding: 0,
      clientSavingsValue: 0,
      nextRevenueMilestone: "Convert the account into a proposal with a clear deposit ask.",
    };
  }

  if (priority === "high") {
    return {
      pipelineValue: 9_500,
      weightedValue: 5_400,
      closedValue: 0,
      invoiceIssued: 0,
      invoiceOutstanding: 0,
      clientSavingsValue: 0,
      nextRevenueMilestone: "Tighten the angle and move the lead toward a concrete offer.",
    };
  }

  return {
    pipelineValue: 4_500,
    weightedValue: 2_100,
    closedValue: 0,
    invoiceIssued: 0,
    invoiceOutstanding: 0,
    clientSavingsValue: 0,
    nextRevenueMilestone: "Qualify the account before spending heavy delivery effort.",
  };
};

const createDefaultDeliveryProfile = () => ({
  stage: "backlog" as const,
  completionPercent: 0,
  nextDeliverable: "Discovery not yet scheduled.",
  dueLabel: "No delivery due yet",
  riskLevel: "low" as const,
});

const createSeedState = (): UtopiaState => {
  const seedTime = nowIso();
  const researchedLead: Lead = leadSchema.parse({
    id: createUuid(),
    name: "Mia Ortega",
    company: "Northline Studio",
    website: "https://northlinestudio.co",
    source: "Referral from design founder network",
    priority: "high",
    status: "researching",
    notes: "Interested in reducing proposal turnaround and client onboarding drag.",
    nextAction: "Send a 4-line note with an audit teaser and onboarding automation example.",
    commercial: {
      pipelineValue: 9_800,
      weightedValue: 6_600,
      closedValue: 0,
      invoiceIssued: 0,
      invoiceOutstanding: 0,
      clientSavingsValue: 36_000,
      nextRevenueMilestone: "Convert the research into a paid audit kickoff call.",
    },
    delivery: {
      stage: "scoping",
      completionPercent: 24,
      nextDeliverable: "Scope the onboarding automation audit and confirm kickoff.",
      dueLabel: "Audit scope due tomorrow",
      riskLevel: "medium",
    },
    research: {
      overview:
        "Northline Studio looks like a strong boutique-services fit where workflow automation can tighten proposal speed and reduce onboarding overhead without disrupting delivery quality.",
      companySnapshot:
        "Creative studio lead from a warm referral with clear process pain around proposals, onboarding, and team handoff consistency.",
      icpFit:
        "High alignment for a compact AI operations sprint focused on service delivery systems and founder leverage.",
      buyingSignals: [
        "Warm referral context lowers trust friction.",
        "Explicit workflow pain already surfaced in intake notes.",
        "Service business likely benefits from repeatable audit-to-delivery templates.",
      ],
      opportunities: [
        {
          title: "AI Efficiency Audit",
          reason:
            "Proposal and onboarding friction can be mapped quickly into a concrete automation roadmap.",
          confidence: 88,
        },
        {
          title: "Sales Follow-up System",
          reason:
            "Referral leads can convert faster with prebuilt follow-up sequences and qualification prompts.",
          confidence: 74,
        },
      ],
      recommendedOffer: "AI Efficiency Audit with a proposal and onboarding workflow blueprint.",
      nextAction:
        "Send a warm intro follow-up that frames a fast audit around proposal turnaround and onboarding clarity.",
      riskFlags: ["Buying urgency is inferred from notes rather than confirmed in a live call."],
      confidence: 82,
      sources: ["Referral intake", "Founder notes", "https://northlinestudio.co"],
    },
    lastResearchedAt: seedTime,
    createdAt: seedTime,
    updatedAt: seedTime,
  });

  const newLead: Lead = leadSchema.parse({
    id: createUuid(),
    name: "Eli Bennett",
    company: "Harbor Ridge Advisory",
    website: "https://harborridgeadvisory.com",
    source: "LinkedIn outbound reply",
    priority: "critical",
    status: "new",
    notes: "Mentioned manual reporting and a stretched ops coordinator.",
    nextAction: "Run AI research and shape a wedge offer around reporting automation.",
    commercial: {
      pipelineValue: 18_500,
      weightedValue: 12_400,
      closedValue: 0,
      invoiceIssued: 0,
      invoiceOutstanding: 0,
      clientSavingsValue: 0,
      nextRevenueMilestone: "Research this lead and frame a reporting automation wedge offer.",
    },
    delivery: createDefaultDeliveryProfile(),
    createdAt: seedTime,
    updatedAt: seedTime,
  });

  const proposalLead: Lead = leadSchema.parse({
    id: createUuid(),
    name: "Mason Lee",
    company: "Summit Tax Advisory",
    website: "https://summittaxadvisory.com",
    source: "Podcast inbound",
    priority: "critical",
    status: "proposal",
    notes: "Interested in replacing manual client reporting and handoffs before EOFY.",
    nextAction: "Follow up on proposal and secure the kickoff deposit.",
    commercial: {
      pipelineValue: 21_000,
      weightedValue: 15_800,
      closedValue: 0,
      invoiceIssued: 6_000,
      invoiceOutstanding: 6_000,
      clientSavingsValue: 82_000,
      nextRevenueMilestone: "Collect the signed scope and deposit to start delivery.",
    },
    delivery: {
      stage: "scoping",
      completionPercent: 42,
      nextDeliverable: "Prepare kickoff deck and implementation plan.",
      dueLabel: "Kickoff ready this week",
      riskLevel: "medium",
    },
    createdAt: seedTime,
    updatedAt: seedTime,
  });

  const wonLead: Lead = leadSchema.parse({
    id: createUuid(),
    name: "Aria Chen",
    company: "Driftline Studio",
    website: "https://driftlinestudio.com",
    source: "Warm client referral",
    priority: "high",
    status: "won",
    notes: "Signed for a studio operations sprint and follow-on retainer discussion.",
    nextAction: "Deliver the automation handoff and tee up the ongoing retainer.",
    commercial: {
      pipelineValue: 0,
      weightedValue: 0,
      closedValue: 14_000,
      invoiceIssued: 14_000,
      invoiceOutstanding: 3_500,
      clientSavingsValue: 96_000,
      nextRevenueMilestone: "Collect the final invoice and upsell a maintenance retainer.",
    },
    delivery: {
      stage: "implementation",
      completionPercent: 68,
      nextDeliverable: "Automation handoff and training session.",
      dueLabel: "Handoff due Friday",
      riskLevel: "high",
    },
    createdAt: seedTime,
    updatedAt: seedTime,
  });

  const activities: Activity[] = [
    activitySchema.parse({
      id: createUuid(),
      entityType: "lead",
      entityId: researchedLead.id,
      kind: "lead.researched",
      actor: "agent",
      message: "Research completed for Northline Studio and next action drafted.",
      xpAwards: {
        sales: 35,
        delivery: 0,
        content: 0,
        systems: 8,
        relationships: 5,
        revenue: 0,
        discipline: 4,
      },
      createdAt: seedTime,
    }),
    activitySchema.parse({
      id: createUuid(),
      entityType: "lead",
      entityId: proposalLead.id,
      kind: "deal.proposal_followup",
      actor: "human",
      message: "Proposal sent to Summit Tax Advisory. Deposit follow-up due this week.",
      xpAwards: zeroXp(),
      createdAt: seedTime,
    }),
    activitySchema.parse({
      id: createUuid(),
      entityType: "lead",
      entityId: wonLead.id,
      kind: "deal.delivery_active",
      actor: "system",
      message: "Driftline Studio is in active delivery with a final invoice still outstanding.",
      xpAwards: zeroXp(),
      createdAt: seedTime,
    }),
  ];

  const agentRuns: AgentRun[] = [
    agentRunSchema.parse({
      id: createUuid(),
      action: "research_lead",
      mode: "mock",
      status: "completed",
      summary: "Lead researched with two viable offer angles and a warm follow-up recommendation.",
      targetType: "lead",
      targetId: researchedLead.id,
      requiresApproval: false,
      prompt:
        "Research the lead, surface offer opportunities, and recommend the next low-risk human action.",
      startedAt: seedTime,
      completedAt: seedTime,
    }),
  ];

  const clients: Client[] = [
    clientSchema.parse({
      id: createUuid(),
      leadId: wonLead.id,
      company: wonLead.company,
      status: "active",
      auditNotes: [
        "Studio operations sprint signed with final handoff still in progress.",
      ],
      deliveryRoadmap: [
        "Complete automation handoff and training session.",
        "Package retainer recommendation after final invoice is collected.",
      ],
      createdAt: seedTime,
      updatedAt: seedTime,
    }),
  ];

  const approvals: Approval[] = [
    approvalSchema.parse({
      id: createUuid(),
      action: "send_outbound",
      status: "pending",
      targetType: "lead",
      targetId: proposalLead.id,
      title: "Approve proposal follow-up",
      summary:
        "Send a short deposit follow-up to Summit Tax Advisory before moving the deal forward.",
      requestedBy: "agent",
      payload: {
        draft:
          "Quick follow-up on the kickoff deposit so we can lock the implementation window.",
      },
      createdAt: seedTime,
    }),
  ];

  const templates: Template[] = [
    templateSchema.parse({
      id: createUuid(),
      title: "Research Prompt Contract",
      category: "Agent",
      body:
        "Return strict JSON only. Focus on AI implementation and workflow automation opportunities.",
      version: 1,
      archived: false,
      createdAt: seedTime,
      updatedAt: seedTime,
    }),
    templateSchema.parse({
      id: createUuid(),
      title: "Offer Framing Template",
      category: "Delivery",
      body:
        "State the bottleneck, tie it to time recovery, propose a short audit, and ask for the lowest-friction next conversation.",
      version: 1,
      archived: false,
      createdAt: seedTime,
      updatedAt: seedTime,
    }),
  ];

  return {
    leads: sortLeads([proposalLead, wonLead, researchedLead, newLead]),
    clients,
    approvals,
    templates,
    activities,
    agentRuns,
    statXp: {
      sales: 92,
      delivery: 48,
      content: 22,
      systems: 76,
      relationships: 64,
      revenue: 10,
      discipline: 58,
    },
  };
};

const buildMissions = (state: UtopiaState): Mission[] => {
  const createdCount = state.activities.filter((activity) => activity.kind === "lead.created").length;
  const researchedCount = state.activities.filter(
    (activity) => activity.kind === "lead.researched",
  ).length;
  const systemizedCount = state.activities.filter(
    (activity) => activity.kind === "agent.run.completed",
  ).length;

  return [
    {
      id: "mission-create-lead",
      title: "Prime The Pipeline",
      description: "Create at least one fresh lead so the command center always has new targets.",
      statKey: "systems",
      xpReward: 15,
      completed: createdCount >= 1,
      progressLabel: `${Math.min(createdCount, 1)}/1 lead created`,
    },
    {
      id: "mission-research-lead",
      title: "Run One Deep Research Pass",
      description: "Turn a raw prospect into a researched opportunity with a clear next move.",
      statKey: "sales",
      xpReward: 45,
      completed: researchedCount >= 1,
      progressLabel: `${Math.min(researchedCount, 1)}/1 lead researched`,
    },
    {
      id: "mission-agent-loop",
      title: "Close The Agent Loop",
      description: "Review at least one agent run and capture the resulting action or insight.",
      statKey: "discipline",
      xpReward: 12,
      completed: systemizedCount >= 1,
      progressLabel: `${Math.min(systemizedCount, 1)}/1 run reviewed`,
    },
  ];
};

const buildPipeline = (state: UtopiaState) => {
  const leads = state.leads;

  return [
    {
      label: "Fresh Leads",
      value: leads.filter((lead) => lead.status === "new").length,
      trend: "Queue ready for research",
    },
    {
      label: "Researching",
      value: leads.filter((lead) => lead.status === "researching").length,
      trend: "Agent-assisted qualification",
    },
    {
      label: "Qualified",
      value: leads.filter((lead) => lead.status === "qualified").length,
      trend: "Ready for offer shaping",
    },
    {
      label: "Proposal+",
      value: leads.filter((lead) => ["proposal", "won"].includes(lead.status)).length,
      trend: "Late-stage pipeline pressure",
    },
  ];
};

const sumCommercial = (
  leads: Lead[],
  selector: (lead: NonNullable<Lead["commercial"]>) => number,
) =>
  leads.reduce((total, lead) => total + selector(lead.commercial ?? createDefaultCommercialProfile(lead.priority)), 0);

const buildRevenueSnapshot = (state: UtopiaState) => {
  const collected = sumCommercial(state.leads, (commercial) => commercial.closedValue);
  const outstanding = sumCommercial(state.leads, (commercial) => commercial.invoiceOutstanding);
  const pipeline = sumCommercial(state.leads, (commercial) => commercial.pipelineValue);
  const weightedPipeline = sumCommercial(state.leads, (commercial) => commercial.weightedValue);
  const clientSavings = sumCommercial(state.leads, (commercial) => commercial.clientSavingsValue);
  const progress = Math.min(collected / cashTarget, 1);
  const liveInvoices = state.leads.filter(
    (lead) => (lead.commercial?.invoiceOutstanding ?? 0) > 0,
  ).length;
  const proposalCount = state.leads.filter((lead) => lead.status === "proposal").length;
  const wonCount = state.leads.filter((lead) => lead.status === "won").length;
  const gap = Math.max(cashTarget - collected, 0);

  return {
    target: cashTarget,
    collected,
    outstanding,
    pipeline,
    weightedPipeline,
    clientSavings,
    progress,
    headline:
      gap > 0
        ? `$${gap.toLocaleString("en-AU")} left to hit the current cash target.`
        : "Cash target cleared. Push the next wave of pipeline forward.",
    financeMetrics: [
      {
        label: "Collected",
        amount: collected,
        changeLabel: `${wonCount} won account${wonCount === 1 ? "" : "s"} contributing`,
        tone: "success" as const,
      },
      {
        label: "Awaiting Payment",
        amount: outstanding,
        changeLabel: `${liveInvoices} live invoice${liveInvoices === 1 ? "" : "s"} to chase`,
        tone: outstanding > 0 ? ("warning" as const) : ("neutral" as const),
      },
      {
        label: "Weighted Pipeline",
        amount: weightedPipeline,
        changeLabel: `${proposalCount} close-ready account${proposalCount === 1 ? "" : "s"} in play`,
        tone: "neutral" as const,
      },
      {
        label: "Client Savings",
        amount: clientSavings,
        changeLabel: "Proof of value to feed back into sales",
        tone: "success" as const,
      },
    ],
  };
};

const buildActionItems = (state: UtopiaState) => {
  const highestPipelineLead = [...state.leads].sort(
    (a, b) => (b.commercial?.weightedValue ?? 0) - (a.commercial?.weightedValue ?? 0),
  )[0];
  const unpaidLead = [...state.leads].find(
    (lead) => (lead.commercial?.invoiceOutstanding ?? 0) > 0,
  );
  const deliveryRiskLead = [...state.leads].find(
    (lead) => lead.delivery?.riskLevel === "high",
  );
  const rawLead = state.leads.find((lead) => !lead.research);

  const items = [
    unpaidLead && {
      id: "action-collect-invoice",
      title: `Collect ${unpaidLead.company}`,
      description: unpaidLead.commercial?.nextRevenueMilestone ?? "Collect the outstanding invoice.",
      href: `/leads/${unpaidLead.id}`,
      emphasis: "revenue" as const,
      valueLabel: `$${(unpaidLead.commercial?.invoiceOutstanding ?? 0).toLocaleString("en-AU")} open`,
    },
    highestPipelineLead && {
      id: "action-close-pipeline",
      title: `Advance ${highestPipelineLead.company}`,
      description:
        highestPipelineLead.commercial?.nextRevenueMilestone ??
        "Push the lead to the next commercial checkpoint.",
      href: `/leads/${highestPipelineLead.id}`,
      emphasis: "pipeline" as const,
      valueLabel: `$${(highestPipelineLead.commercial?.weightedValue ?? 0).toLocaleString("en-AU")} weighted`,
    },
    deliveryRiskLead && {
      id: "action-delivery-risk",
      title: `Unblock ${deliveryRiskLead.company}`,
      description:
        deliveryRiskLead.delivery?.nextDeliverable ?? "Review the next delivery milestone.",
      href: `/leads/${deliveryRiskLead.id}`,
      emphasis: "delivery" as const,
      valueLabel: deliveryRiskLead.delivery?.dueLabel ?? "Due soon",
    },
    rawLead && {
      id: "action-research-queue",
      title: `Research ${rawLead.company}`,
      description: rawLead.nextAction ?? "Turn the raw lead into a scoped revenue play.",
      href: `/leads/${rawLead.id}`,
      emphasis: "ops" as const,
      valueLabel: rawLead.priority.toUpperCase(),
    },
  ].filter(Boolean);

  if (items.length > 0) {
    return items;
  }

  return [
    {
      id: "action-create-first-lead",
      title: "Create the first lead",
      description: "Add a prospect to start building pipeline and unlock the research workflow.",
      href: "/leads",
      emphasis: "ops" as const,
      valueLabel: "START",
    },
  ];
};

const buildDeliverySnapshot = (state: UtopiaState) => {
  const highlightedAccounts = state.leads
    .filter((lead) => lead.delivery && lead.status !== "lost")
    .sort(
      (a, b) =>
        (b.commercial?.invoiceOutstanding ?? b.commercial?.closedValue ?? 0) -
        (a.commercial?.invoiceOutstanding ?? a.commercial?.closedValue ?? 0),
    )
    .slice(0, 4);

  const activeCount = highlightedAccounts.filter(
    (lead) => (lead.delivery?.stage ?? "backlog") !== "backlog",
  ).length;
  const dueSoonCount = highlightedAccounts.filter(
    (lead) => (lead.delivery?.completionPercent ?? 0) < 100,
  ).length;
  const atRiskCount = highlightedAccounts.filter(
    (lead) => lead.delivery?.riskLevel === "high",
  ).length;
  const nextPayoutLead = [...state.leads]
    .filter((lead) => (lead.commercial?.invoiceOutstanding ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.commercial?.invoiceOutstanding ?? 0) - (a.commercial?.invoiceOutstanding ?? 0),
    )[0];

  return {
    activeCount,
    dueSoonCount,
    atRiskCount,
    nextPayoutLabel: nextPayoutLead
      ? `$${(nextPayoutLead.commercial?.invoiceOutstanding ?? 0).toLocaleString("en-AU")} due from ${nextPayoutLead.company}`
      : "No invoices currently awaiting payment",
    highlightedAccounts,
  };
};

const listProgressStatsFromMap = (statXp: StatXpMap): ProgressStat[] =>
  (Object.keys(statXp) as StatKey[]).map((key) => buildProgressStat(key, statXp[key]));

const getFeaturedLead = (state: UtopiaState) =>
  state.leads.find((lead) => !lead.research) ?? state.leads[0] ?? null;

const buildDashboardSummary = (state: UtopiaState): DashboardSummary =>
  dashboardSummarySchema.parse({
    generatedAt: nowIso(),
    mainQuest: {
      title: "Turn today’s hottest pipeline move into collected cash.",
      description:
        buildActionItems(state)[0]?.description ??
        getFeaturedLead(state)?.nextAction ??
        "Keep the revenue board moving by closing, collecting, or delivering.",
      xpReward: 45,
    },
    revenue: buildRevenueSnapshot(state),
    actionItems: buildActionItems(state),
    delivery: buildDeliverySnapshot(state),
    missions: buildMissions(state),
    pipeline: buildPipeline(state),
    stats: listProgressStatsFromMap(state.statXp),
    recentActivity: [...state.activities]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    agentRuns: [...state.agentRuns]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 4),
    approvals: [...state.approvals]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4),
    featuredLead: getFeaturedLead(state),
  });

const normalizeOptionalString = (value: string | null | undefined) =>
  value?.trim() ? value : undefined;

const normalizeDateTime = (value: string) => new Date(value).toISOString();

const normalizeXp = (value: unknown): StatXpMap => {
  const raw = typeof value === "object" && value ? value : {};
  const getValue = (key: StatKey) => {
    const candidate = (raw as Record<string, unknown>)[key];

    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
  };

  return {
    sales: getValue("sales"),
    delivery: getValue("delivery"),
    content: getValue("content"),
    systems: getValue("systems"),
    relationships: getValue("relationships"),
    revenue: getValue("revenue"),
    discipline: getValue("discipline"),
  };
};

const parseResearch = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if (Array.isArray(payload)) {
    return undefined;
  }

  if (Object.keys(payload).length === 0) {
    return undefined;
  }

  return researchLeadResultSchema.parse(payload);
};

const parseProfileObject = <T>(payload: unknown, parser: (value: unknown) => T) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  if (Object.keys(payload).length === 0) {
    return undefined;
  }

  return parser(payload);
};

const toLead = (row: LeadRow): Lead =>
  leadSchema.parse({
    id: row.id,
    name: row.name,
    company: row.company,
    website: normalizeOptionalString(row.website),
    source: normalizeOptionalString(row.source),
    priority: row.priority,
    status: row.status,
    notes: normalizeOptionalString(row.notes),
    nextAction: normalizeOptionalString(row.next_action),
    research: parseResearch(row.research_payload),
    commercial: parseProfileObject(row.commercial_profile, leadSchema.shape.commercial.parse),
    delivery: parseProfileObject(row.delivery_profile, leadSchema.shape.delivery.parse),
    lastResearchedAt: row.last_researched_at ? normalizeDateTime(row.last_researched_at) : undefined,
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  });

const toActivity = (row: ActivityRow): Activity =>
  activitySchema.parse({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    kind: row.kind,
    actor: row.actor,
    message: row.message,
    xpAwards: normalizeXp(row.xp_awards),
    createdAt: normalizeDateTime(row.created_at),
  });

const toAgentRun = (row: AgentRunRow): AgentRun =>
  agentRunSchema.parse({
    id: row.id,
    action: row.action,
    mode: row.mode,
    status: row.status,
    summary: row.summary ?? "Run awaiting summary.",
    targetType: row.target_type,
    targetId: row.target_id,
    requiresApproval: row.requires_approval,
    prompt: row.prompt,
    startedAt: normalizeDateTime(row.started_at),
    completedAt: row.completed_at ? normalizeDateTime(row.completed_at) : undefined,
    error: normalizeOptionalString(row.error),
  });

const parseStringArray = (payload: unknown) =>
  Array.isArray(payload)
    ? payload.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const toApproval = (row: ApprovalRow): Approval =>
  approvalSchema.parse({
    id: row.id,
    action: row.action,
    status: row.status,
    targetType: row.target_type,
    targetId: row.target_id,
    title: row.title,
    summary: row.summary,
    requestedBy: row.requested_by,
    payload: typeof row.payload === "object" && row.payload && !Array.isArray(row.payload) ? row.payload : {},
    createdAt: normalizeDateTime(row.created_at),
    resolvedAt: row.resolved_at ? normalizeDateTime(row.resolved_at) : undefined,
  });

const toClient = (row: ClientRow): Client =>
  clientSchema.parse({
    id: row.id,
    leadId: normalizeOptionalString(row.lead_id),
    company: row.company,
    status: row.status,
    auditNotes: parseStringArray(row.audit_notes),
    deliveryRoadmap: parseStringArray(row.delivery_roadmap),
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  });

const toTemplate = (row: TemplateRow): Template => {
  const metadata =
    typeof row.metadata === "object" && row.metadata && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return templateSchema.parse({
    id: row.id,
    title: row.title,
    category: row.category,
    body: row.body,
    version: typeof metadata.version === "number" ? metadata.version : 1,
    archived: metadata.archived === true,
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  });
};

const mapProgressionStatsRow = (
  row: Partial<ProgressionStatsRow> | null | undefined,
): StatXpMap => ({
  ...zeroXp(),
  sales: row?.sales ?? 0,
  delivery: row?.delivery ?? 0,
  content: row?.content ?? 0,
  systems: row?.systems ?? 0,
  relationships: row?.relationships ?? 0,
  revenue: row?.revenue ?? 0,
  discipline: row?.discipline ?? 0,
});

const assertNoError = (error: { message: string } | null, context: string) => {
  if (error) {
    throw new Error(compact([context, error.message]));
  }
};

export const createMemoryUtopiaRepository = (
  initialState: UtopiaState = createSeedState(),
): UtopiaRepository => {
  let state: UtopiaState = {
    leads: sortLeads(initialState.leads),
    clients: [...initialState.clients],
    approvals: [...initialState.approvals],
    templates: [...initialState.templates],
    activities: [...initialState.activities],
    agentRuns: [...initialState.agentRuns],
    statXp: { ...initialState.statXp },
  };

  const listProgressStats = async () => listProgressStatsFromMap(state.statXp);

  return {
    mode: "memory",
    reset: async () => {
      state = createSeedState();
    },
    getSchemaCheck: async () => null,
    getDashboardSummary: async () => buildDashboardSummary(state),
    listProgressStats,
    listLeads: async () => sortLeads(state.leads),
    getLead: async (leadId) => state.leads.find((lead) => lead.id === leadId) ?? null,
    createLead: async (input) => {
      const timestamp = nowIso();
      const lead = leadSchema.parse({
        id: createUuid(),
        ...input,
        status: "new",
        nextAction: "Run AI research to sharpen the first outreach angle.",
        commercial: createDefaultCommercialProfile(input.priority),
        delivery: createDefaultDeliveryProfile(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      state = {
        ...state,
        leads: sortLeads([lead, ...state.leads]),
      };

      return lead;
    },
    createLeadWithActivity: async ({ lead: input, activity, xpAwards }) => {
      const lead = await (async () => {
        const timestamp = nowIso();
        const createdLead = leadSchema.parse({
          id: createUuid(),
          ...input,
          status: "new",
          nextAction: "Run AI research to sharpen the first outreach angle.",
          commercial: createDefaultCommercialProfile(input.priority),
          delivery: createDefaultDeliveryProfile(),
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        state = {
          ...state,
          leads: sortLeads([createdLead, ...state.leads]),
        };

        return createdLead;
      })();
      const stats = await listProgressStatsFromMap({
        sales: state.statXp.sales + (xpAwards.sales ?? 0),
        delivery: state.statXp.delivery + (xpAwards.delivery ?? 0),
        content: state.statXp.content + (xpAwards.content ?? 0),
        systems: state.statXp.systems + (xpAwards.systems ?? 0),
        relationships: state.statXp.relationships + (xpAwards.relationships ?? 0),
        revenue: state.statXp.revenue + (xpAwards.revenue ?? 0),
        discipline: state.statXp.discipline + (xpAwards.discipline ?? 0),
      });
      state = {
        ...state,
        statXp: {
          sales: stats.find((stat) => stat.key === "sales")?.xp ?? state.statXp.sales,
          delivery: stats.find((stat) => stat.key === "delivery")?.xp ?? state.statXp.delivery,
          content: stats.find((stat) => stat.key === "content")?.xp ?? state.statXp.content,
          systems: stats.find((stat) => stat.key === "systems")?.xp ?? state.statXp.systems,
          relationships:
            stats.find((stat) => stat.key === "relationships")?.xp ?? state.statXp.relationships,
          revenue: stats.find((stat) => stat.key === "revenue")?.xp ?? state.statXp.revenue,
          discipline: stats.find((stat) => stat.key === "discipline")?.xp ?? state.statXp.discipline,
        },
      };
      const createdActivity = activitySchema.parse({
        ...activity,
        entityId: lead.id,
        id: activity.id ?? createUuid(),
        createdAt: activity.createdAt ?? nowIso(),
      });
      state = {
        ...state,
        activities: [createdActivity, ...state.activities],
      };

      return { lead, activity: createdActivity, stats };
    },
    updateLead: async (leadId, input) => {
      const timestamp = nowIso();
      let updatedLead: Lead | null = null;

      state = {
        ...state,
        leads: sortLeads(
          state.leads.map((lead) => {
            if (lead.id !== leadId) {
              return lead;
            }

            updatedLead = leadSchema.parse({
              ...lead,
              ...input,
              commercial: input.commercial
                ? {
                    ...(lead.commercial ?? createDefaultCommercialProfile(lead.priority)),
                    ...input.commercial,
                  }
                : lead.commercial,
              delivery: input.delivery
                ? { ...(lead.delivery ?? createDefaultDeliveryProfile()), ...input.delivery }
                : lead.delivery,
              updatedAt: timestamp,
            });

            return updatedLead;
          }),
        ),
      };

      return updatedLead;
    },
    updateLeadWithActivity: async ({ leadId, patch, activity }) => {
      const lead = await (async () => {
        const timestamp = nowIso();
        let updatedLead: Lead | null = null;

        state = {
          ...state,
          leads: sortLeads(
            state.leads.map((candidate) => {
              if (candidate.id !== leadId) {
                return candidate;
              }

              updatedLead = leadSchema.parse({
                ...candidate,
                ...patch,
                commercial: patch.commercial
                  ? {
                      ...(candidate.commercial ?? createDefaultCommercialProfile(candidate.priority)),
                      ...patch.commercial,
                    }
                  : candidate.commercial,
                delivery: patch.delivery
                  ? { ...(candidate.delivery ?? createDefaultDeliveryProfile()), ...patch.delivery }
                  : candidate.delivery,
                updatedAt: timestamp,
              });

              return updatedLead;
            }),
          ),
        };

        return updatedLead;
      })();

      if (!lead) {
        return null;
      }
      const persistedLead = lead as Lead;

      const createdActivity = activitySchema.parse({
        ...activity,
        entityId: persistedLead.id,
        id: activity.id ?? createUuid(),
        createdAt: activity.createdAt ?? nowIso(),
      });
      state = {
        ...state,
        activities: [createdActivity, ...state.activities],
      };

      return { lead: persistedLead, activity: createdActivity };
    },
    updateLeadStatus: async (leadId, status) => {
      const timestamp = nowIso();
      let updatedLead: Lead | null = null;

      state = {
        ...state,
        leads: state.leads.map((lead) => {
          if (lead.id !== leadId) {
            return lead;
          }

          updatedLead = leadSchema.parse({
            ...lead,
            status,
            updatedAt: timestamp,
          });

          return updatedLead;
        }),
      };

      return updatedLead;
    },
    applyResearchToLead: async (leadId, research) => {
      const timestamp = nowIso();
      let updatedLead: Lead | null = null;

      state = {
        ...state,
        leads: sortLeads(
          state.leads.map((lead) => {
            if (lead.id !== leadId) {
              return lead;
            }

            updatedLead = leadSchema.parse({
              ...lead,
              status: lead.status === "new" ? "researching" : lead.status,
              nextAction: research.nextAction,
              research,
              lastResearchedAt: timestamp,
              updatedAt: timestamp,
            });

            return updatedLead;
          }),
        ),
      };

      return updatedLead;
    },
    awardXp: async (xpAwards) => {
      state = {
        ...state,
        statXp: {
          sales: state.statXp.sales + (xpAwards.sales ?? 0),
          delivery: state.statXp.delivery + (xpAwards.delivery ?? 0),
          content: state.statXp.content + (xpAwards.content ?? 0),
          systems: state.statXp.systems + (xpAwards.systems ?? 0),
          relationships: state.statXp.relationships + (xpAwards.relationships ?? 0),
          revenue: state.statXp.revenue + (xpAwards.revenue ?? 0),
          discipline: state.statXp.discipline + (xpAwards.discipline ?? 0),
        },
      };

      return listProgressStats();
    },
    createActivity: async (input) => {
      const activity = activitySchema.parse({
        ...input,
        id: input.id ?? createUuid(),
        createdAt: input.createdAt ?? nowIso(),
      });

      state = {
        ...state,
        activities: [activity, ...state.activities],
      };

      return activity;
    },
    createAgentRun: async (input) => {
      const run = agentRunSchema.parse({
        ...input,
        id: input.id ?? createUuid(),
        startedAt: input.startedAt ?? nowIso(),
      });

      state = {
        ...state,
        agentRuns: [run, ...state.agentRuns],
      };

      return run;
    },
    updateAgentRun: async (runId, updates) => {
      let updatedRun: AgentRun | null = null;

      state = {
        ...state,
        agentRuns: state.agentRuns.map((run) => {
          if (run.id !== runId) {
            return run;
          }

          updatedRun = agentRunSchema.parse({
            ...run,
            ...updates,
          });

          return updatedRun;
        }),
      };

      return updatedRun;
    },
    startLeadResearchRun: async ({ leadId, run }) => {
      const lead = await (async () => {
        const timestamp = nowIso();
        let updatedLead: Lead | null = null;

        state = {
          ...state,
          leads: sortLeads(
            state.leads.map((candidate) => {
              if (candidate.id !== leadId) {
                return candidate;
              }

              updatedLead = leadSchema.parse({
                ...candidate,
                status: "researching",
                updatedAt: timestamp,
              });

              return updatedLead;
            }),
          ),
        };

        return updatedLead;
      })();

      if (!lead) {
        return null;
      }

      const agentRun = agentRunSchema.parse({
        ...run,
        id: run.id ?? createUuid(),
        startedAt: run.startedAt ?? nowIso(),
      });
      state = {
        ...state,
        agentRuns: [agentRun, ...state.agentRuns],
      };

      return { lead, agentRun };
    },
    completeLeadResearch: async ({
      leadId,
      runId,
      research,
      leadStatusOnComplete = "qualified",
      runUpdates,
      activity,
      xpAwards,
    }) => {
      const timestamp = nowIso();
      let updatedLead: Lead | null = null;
      let updatedRun: AgentRun | null = null;

      state = {
        ...state,
        leads: sortLeads(
          state.leads.map((candidate) => {
            if (candidate.id !== leadId) {
              return candidate;
            }

            updatedLead = leadSchema.parse({
              ...candidate,
              status: leadStatusOnComplete,
              nextAction: research.nextAction,
              research,
              lastResearchedAt: timestamp,
              updatedAt: timestamp,
            });

            return updatedLead;
          }),
        ),
        agentRuns: state.agentRuns.map((candidate) => {
          if (candidate.id !== runId) {
            return candidate;
          }

          updatedRun = agentRunSchema.parse({
            ...candidate,
            ...runUpdates,
            completedAt: runUpdates.completedAt ?? timestamp,
          });

          return updatedRun;
        }),
        statXp: {
          sales: state.statXp.sales + (xpAwards.sales ?? 0),
          delivery: state.statXp.delivery + (xpAwards.delivery ?? 0),
          content: state.statXp.content + (xpAwards.content ?? 0),
          systems: state.statXp.systems + (xpAwards.systems ?? 0),
          relationships: state.statXp.relationships + (xpAwards.relationships ?? 0),
          revenue: state.statXp.revenue + (xpAwards.revenue ?? 0),
          discipline: state.statXp.discipline + (xpAwards.discipline ?? 0),
        },
      };

      if (!updatedLead || !updatedRun) {
        return null;
      }
      const persistedLead = updatedLead as Lead;
      const persistedRun = updatedRun as AgentRun;

      const createdActivity = activitySchema.parse({
        ...activity,
        entityId: persistedLead.id,
        id: activity.id ?? createUuid(),
        createdAt: activity.createdAt ?? timestamp,
      });
      state = {
        ...state,
        activities: [createdActivity, ...state.activities],
      };

      return {
        lead: persistedLead,
        agentRun: persistedRun,
        activity: createdActivity,
        stats: await listProgressStats(),
      };
    },
    failLeadResearch: async ({ leadId, runId, restoreStatus, runUpdates, activity }) => {
      const timestamp = nowIso();
      let updatedLead: Lead | null = null;
      let updatedRun: AgentRun | null = null;

      state = {
        ...state,
        leads: sortLeads(
          state.leads.map((candidate) => {
            if (candidate.id !== leadId) {
              return candidate;
            }

            updatedLead = leadSchema.parse({
              ...candidate,
              status: restoreStatus,
              updatedAt: timestamp,
            });

            return updatedLead;
          }),
        ),
        agentRuns: state.agentRuns.map((candidate) => {
          if (candidate.id !== runId) {
            return candidate;
          }

          updatedRun = agentRunSchema.parse({
            ...candidate,
            ...runUpdates,
            completedAt: runUpdates.completedAt ?? timestamp,
          });

          return updatedRun;
        }),
      };

      const createdActivity = activity
        ? activitySchema.parse({
            ...activity,
            entityId: runId,
            id: activity.id ?? createUuid(),
            createdAt: activity.createdAt ?? timestamp,
          })
        : undefined;

      if (createdActivity) {
        state = {
          ...state,
          activities: [createdActivity, ...state.activities],
        };
      }

      return { lead: updatedLead, agentRun: updatedRun, activity: createdActivity };
    },
    listApprovals: async () =>
      [...state.approvals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    createApproval: async (input) => {
      const approval = approvalSchema.parse({
        ...input,
        id: createUuid(),
        status: "pending",
        requestedBy: "human",
        createdAt: nowIso(),
      });

      state = {
        ...state,
        approvals: [approval, ...state.approvals],
      };

      return approval;
    },
    resolveApproval: async (approvalId, decision) => {
      let updatedApproval: Approval | null = null;

      state = {
        ...state,
        approvals: state.approvals.map((approval) => {
          if (approval.id !== approvalId) {
            return approval;
          }

          updatedApproval = approvalSchema.parse({
            ...approval,
            status: decision,
            resolvedAt: nowIso(),
          });

          return updatedApproval;
        }),
      };

      return updatedApproval;
    },
    listClients: async () =>
      [...state.clients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    promoteLeadToClient: async (leadId, input = {}) => {
      const lead = state.leads.find((candidate) => candidate.id === leadId);

      if (!lead) {
        return null;
      }

      const timestamp = nowIso();
      const existingClient = state.clients.find((client) => client.leadId === leadId);
      const auditNotes = [
        ...(existingClient?.auditNotes ?? []),
        input.auditNote ?? lead.research?.overview ?? lead.notes ?? "Lead promoted into client delivery.",
      ];
      const deliveryRoadmap = [
        ...(existingClient?.deliveryRoadmap ?? []),
        input.roadmapItem ??
          lead.delivery?.nextDeliverable ??
          lead.research?.recommendedOffer ??
          "Confirm delivery roadmap.",
      ];
      const client = clientSchema.parse({
        id: existingClient?.id ?? createUuid(),
        leadId,
        company: lead.company,
        status: existingClient?.status ?? "active",
        auditNotes,
        deliveryRoadmap,
        createdAt: existingClient?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
      const updatedLead = leadSchema.parse({
        ...lead,
        status: lead.status === "won" ? lead.status : "proposal",
        delivery: lead.delivery ?? createDefaultDeliveryProfile(),
        updatedAt: timestamp,
      });

      state = {
        ...state,
        clients: existingClient
          ? state.clients.map((candidate) => (candidate.id === client.id ? client : candidate))
          : [client, ...state.clients],
        leads: sortLeads(
          state.leads.map((candidate) =>
            candidate.id === updatedLead.id ? updatedLead : candidate,
          ),
        ),
      };

      return { client, lead: updatedLead };
    },
    promoteLeadWithActivity: async ({ leadId, promotion, activity }) => {
      const promoted = await (async () => {
        const lead = state.leads.find((candidate) => candidate.id === leadId);

        if (!lead) {
          return null;
        }

        const timestamp = nowIso();
        const existingClient = state.clients.find((client) => client.leadId === leadId);
        const auditNotes = [
          ...(existingClient?.auditNotes ?? []),
          promotion?.auditNote ??
            lead.research?.overview ??
            lead.notes ??
            "Lead promoted into client delivery.",
        ];
        const deliveryRoadmap = [
          ...(existingClient?.deliveryRoadmap ?? []),
          promotion?.roadmapItem ??
            lead.delivery?.nextDeliverable ??
            lead.research?.recommendedOffer ??
            "Confirm delivery roadmap.",
        ];
        const client = clientSchema.parse({
          id: existingClient?.id ?? createUuid(),
          leadId,
          company: lead.company,
          status: existingClient?.status ?? "active",
          auditNotes,
          deliveryRoadmap,
          createdAt: existingClient?.createdAt ?? timestamp,
          updatedAt: timestamp,
        });
        const updatedLead = leadSchema.parse({
          ...lead,
          status: lead.status === "won" ? lead.status : "proposal",
          delivery: lead.delivery ?? createDefaultDeliveryProfile(),
          updatedAt: timestamp,
        });

        state = {
          ...state,
          clients: existingClient
            ? state.clients.map((candidate) => (candidate.id === client.id ? client : candidate))
            : [client, ...state.clients],
          leads: sortLeads(
            state.leads.map((candidate) =>
              candidate.id === updatedLead.id ? updatedLead : candidate,
            ),
          ),
        };

        return { client, lead: updatedLead };
      })();

      if (!promoted) {
        return null;
      }

      const createdActivity = activitySchema.parse({
        ...activity,
        entityId: promoted.lead.id,
        id: activity.id ?? createUuid(),
        createdAt: activity.createdAt ?? nowIso(),
      });
      state = {
        ...state,
        activities: [createdActivity, ...state.activities],
      };

      return { ...promoted, activity: createdActivity };
    },
    updateClient: async (clientId, input) => {
      let updatedClient: Client | null = null;

      state = {
        ...state,
        clients: state.clients.map((client) => {
          if (client.id !== clientId) {
            return client;
          }

          updatedClient = clientSchema.parse({
            ...client,
            status: input.status ?? client.status,
            auditNotes: input.auditNote
              ? [...client.auditNotes, input.auditNote]
              : client.auditNotes,
            deliveryRoadmap: input.roadmapItem
              ? [...client.deliveryRoadmap, input.roadmapItem]
              : client.deliveryRoadmap,
            updatedAt: nowIso(),
          });

          return updatedClient;
        }),
      };

      return updatedClient;
    },
    listTemplates: async () =>
      [...state.templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    createTemplate: async (input) => {
      const timestamp = nowIso();
      const template = templateSchema.parse({
        ...input,
        id: createUuid(),
        version: 1,
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      state = {
        ...state,
        templates: [template, ...state.templates],
      };

      return template;
    },
    updateTemplate: async (templateId, input) => {
      let updatedTemplate: Template | null = null;

      state = {
        ...state,
        templates: state.templates.map((template) => {
          if (template.id !== templateId) {
            return template;
          }

          updatedTemplate = templateSchema.parse({
            ...template,
            ...input,
            version:
              input.body && input.body !== template.body
                ? template.version + 1
                : template.version,
            updatedAt: nowIso(),
          });

          return updatedTemplate;
        }),
      };

      return updatedTemplate;
    },
  };
};

export const createUtopiaRepository = createMemoryUtopiaRepository;

export const createSupabaseUtopiaRepository = ({
  client = createSupabaseAdminClient(),
  ownerId = runtimeEnv.UTOPIA_OWNER_ID,
}: SupabaseRepositoryOptions = {}): UtopiaRepository => {
  const configuredOwnerId = ownerId?.trim() || undefined;
  const getOwnerId = () => {
    if (!configuredOwnerId) {
      throw new Error(
        "Missing owner id for the Supabase repository. Provide an authenticated user id or UTOPIA_OWNER_ID.",
      );
    }

    if (!uuidPattern.test(configuredOwnerId)) {
      throw new Error("The Supabase repository owner id must be a valid UUID.");
    }

    return configuredOwnerId;
  };

  const checkSchema = async (): Promise<SchemaCheckResult> => {
    const checks = [
      {
        key: "leads.owner_id",
        run: () =>
          client
            .from("leads")
            .select(
              "id, owner_id, research_payload, commercial_profile, delivery_profile, next_action, last_researched_at",
            )
            .limit(1),
      },
      {
        key: "activities.owner_id",
        run: () => client.from("activities").select("id, owner_id").limit(1),
      },
      {
        key: "agent_runs.owner_id",
        run: () => client.from("agent_runs").select("id, owner_id").limit(1),
      },
      {
        key: "approvals.owner_id",
        run: () => client.from("approvals").select("id, owner_id").limit(1),
      },
      {
        key: "clients.owner_id",
        run: () => client.from("clients").select("id, owner_id").limit(1),
      },
      {
        key: "templates.owner_id",
        run: () => client.from("templates").select("id, owner_id").limit(1),
      },
      {
        key: "progression_stats.owner_id",
        run: () => client.from("progression_stats").select("owner_id").limit(1),
      },
    ] as const;
    const results = await Promise.all(
      checks.map(async (check) => ({
        key: check.key,
        error: (await check.run()).error,
      })),
    );
    const missing = results.flatMap(({ key, error }) => {
      if (!error) {
        return [];
      }

      console.error("Supabase schema check failed", {
        key,
        error,
      });
      return [key];
    });

    return {
      ok: missing.length === 0,
      missing,
    };
  };

  const ensureProgressionRow = async (timeoutMs?: number) => {
    const ownerId = getOwnerId();
    const query = client
      .from("progression_stats")
      .upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true });
    const { error } =
      typeof timeoutMs === "number"
        ? await withAbortableTimeout("progression_stats.ensure", query, timeoutMs)
        : await query;

    assertNoError(error, "Failed to ensure progression stats row.");
  };

  const loadState = async (): Promise<UtopiaState> => {
    const ownerId = getOwnerId();
    await ensureProgressionRow();

    const [
      { data: leadRows, error: leadsError },
      { data: clientRows, error: clientsError },
      { data: approvalRows, error: approvalsError },
      { data: templateRows, error: templatesError },
      { data: activityRows, error: activitiesError },
      { data: agentRunRows, error: agentRunsError },
      { data: progressionRow, error: progressionError },
    ] = await Promise.all([
        client
          .from("leads")
          .select(
            "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
          )
          .eq("owner_id", ownerId)
          .order("updated_at", { ascending: false }),
        client
          .from("clients")
          .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
          .eq("owner_id", ownerId)
          .order("updated_at", { ascending: false }),
        client
          .from("approvals")
          .select("id, action, status, target_type, target_id, title, summary, requested_by, payload, created_at, resolved_at")
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false }),
        client
          .from("templates")
          .select("id, title, category, body, metadata, created_at, updated_at")
          .eq("owner_id", ownerId)
          .order("updated_at", { ascending: false }),
        client
          .from("activities")
          .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false }),
        client
          .from("agent_runs")
          .select(
            "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
          )
          .eq("owner_id", ownerId)
          .order("started_at", { ascending: false }),
        client
          .from("progression_stats")
          .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
          .eq("owner_id", ownerId)
          .maybeSingle(),
      ]);

    assertNoError(leadsError, "Failed to load leads.");
    assertNoError(clientsError, "Failed to load clients.");
    assertNoError(approvalsError, "Failed to load approvals.");
    assertNoError(templatesError, "Failed to load templates.");
    assertNoError(activitiesError, "Failed to load activities.");
    assertNoError(agentRunsError, "Failed to load agent runs.");
    assertNoError(progressionError, "Failed to load progression stats.");

    return {
      leads: sortLeads(safeMapRows("lead", (leadRows ?? []) as LeadRow[], toLead)),
      clients: safeMapRows("client", (clientRows ?? []) as ClientRow[], toClient),
      approvals: safeMapRows("approval", (approvalRows ?? []) as ApprovalRow[], toApproval),
      templates: safeMapRows("template", (templateRows ?? []) as TemplateRow[], toTemplate),
      activities: safeMapRows("activity", (activityRows ?? []) as ActivityRow[], toActivity),
      agentRuns: safeMapRows("agent run", (agentRunRows ?? []) as AgentRunRow[], toAgentRun),
      statXp: mapProgressionStatsRow(progressionRow as ProgressionStatsRow | null),
    };
  };

  const listProgressStats = async () => {
    const ownerId = getOwnerId();
    await ensureProgressionRow();
    const { data, error } = await client
      .from("progression_stats")
      .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
      .eq("owner_id", ownerId)
      .single();

    assertNoError(error, "Failed to fetch progression stats.");

    return listProgressStatsFromMap(mapProgressionStatsRow(data as ProgressionStatsRow));
  };

  const getLeadById = async (leadId: string) => {
    const ownerId = getOwnerId();
    const { data, error } = await client
      .from("leads")
      .select(leadSelectColumns)
      .eq("owner_id", ownerId)
      .eq("id", leadId)
      .maybeSingle();

    assertNoError(error, "Failed to fetch lead.");

    return data ? toLead(data as LeadRow) : null;
  };

  const insertLead = async (input: CreateLeadInput): Promise<Lead> => {
    const ownerId = getOwnerId();
    const leadInsert = {
      owner_id: ownerId,
      name: input.name,
      company: input.company,
      website: input.website ?? null,
      source: input.source ?? null,
      priority: input.priority,
      status: "new" as const,
      notes: input.notes ?? null,
      next_action: "Run AI research to sharpen the first outreach angle.",
      research_payload: {},
      commercial_profile: createDefaultCommercialProfile(input.priority),
      delivery_profile: createDefaultDeliveryProfile(),
    };

    logLeadCreate("lead.create.insert.start", {
      operation: "leads.insert",
    });

    const { data, error } = await withAbortableTimeout(
      "leads.insert",
      client.from("leads").insert(leadInsert).select(leadSelectColumns).single(),
    );

    assertNoError(error, "Failed to create lead.");
    logLeadCreate("lead.create.insert.success", {
      operation: "leads.insert",
    });

    return toLead(data as LeadRow);
  };

  return {
    mode: "supabase",
    reset: async () => {
      throw new Error("Reset is only available for the in-memory repository.");
    },
    getDashboardSummary: async () => buildDashboardSummary(await loadState()),
    getSchemaCheck: checkSchema,
    listProgressStats,
    listLeads: async () => (await loadState()).leads,
    getLead: getLeadById,
    createLead: async (input) => {
      logLeadCreate("lead.create.start", {
        mode: "supabase",
      });
      const lead = await insertLead(input);
      logLeadCreate("lead.create.complete", {
        mode: "supabase",
      });

      return lead;
    },
    createLeadWithActivity: async ({ lead: input, activity, xpAwards }) => {
      logLeadCreate("lead.create.start", {
        mode: "supabase",
        withSideEffects: true,
      });
      const lead = await insertLead(input);
      const fallbackActivity = activitySchema.parse({
        id: activity.id ?? createUuid(),
        entityType: activity.entityType,
        entityId: lead.id,
        kind: activity.kind,
        actor: activity.actor,
        message: activity.message,
        xpAwards: activity.xpAwards,
        createdAt: activity.createdAt ?? nowIso(),
      });

      logLeadCreate("lead.create.side_effects.start", {
        mode: "supabase",
      });

      try {
        const stats = await (async () => {
          const ownerId = getOwnerId();
          await ensureProgressionRow(optionalSideEffectTimeoutMs);
          const { data: currentRow, error: readError } = await withTimeout(
            "progression_stats.read",
            client
              .from("progression_stats")
              .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
              .eq("owner_id", ownerId)
              .single(),
            optionalSideEffectTimeoutMs,
          );

          assertNoError(readError, "Failed to read progression stats before XP award.");

          const current = mapProgressionStatsRow(currentRow as ProgressionStatsRow);
          const next = {
            owner_id: ownerId,
            sales: current.sales + (xpAwards.sales ?? 0),
            delivery: current.delivery + (xpAwards.delivery ?? 0),
            content: current.content + (xpAwards.content ?? 0),
            systems: current.systems + (xpAwards.systems ?? 0),
            relationships: current.relationships + (xpAwards.relationships ?? 0),
            revenue: current.revenue + (xpAwards.revenue ?? 0),
            discipline: current.discipline + (xpAwards.discipline ?? 0),
          };

          const { data, error } = await withAbortableTimeout(
            "progression_stats.upsert",
            client
              .from("progression_stats")
              .upsert(next, { onConflict: "owner_id" })
              .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
              .single(),
            optionalSideEffectTimeoutMs,
          );

          assertNoError(error, "Failed to award XP.");

          return listProgressStatsFromMap(mapProgressionStatsRow(data as ProgressionStatsRow));
        })();
        const createdActivity = await (async () => {
          const ownerId = getOwnerId();
          const { data, error } = await withAbortableTimeout(
            "activities.insert",
            client
              .from("activities")
              .insert({
                id: fallbackActivity.id,
                owner_id: ownerId,
                entity_type: activity.entityType,
                entity_id: lead.id,
                kind: activity.kind,
                actor: activity.actor,
                message: activity.message,
                xp_awards: activity.xpAwards,
                created_at: fallbackActivity.createdAt,
              })
              .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
              .single(),
            optionalSideEffectTimeoutMs,
          );

          assertNoError(error, "Failed to create activity.");

          return toActivity(data as ActivityRow);
        })();

        logLeadCreate("lead.create.complete", {
          mode: "supabase",
          withSideEffects: true,
        });

        return { lead, activity: createdActivity, stats };
      } catch (error) {
        logLeadCreateSideEffectFailure("lead.create.side_effects.failed", error, {
          mode: "supabase",
        });

        if (isSupabaseTimeoutError(error)) {
          throw error;
        }

        logLeadCreate("lead.create.complete", {
          mode: "supabase",
          withSideEffects: true,
          sideEffectsPersisted: false,
        });

        return {
          lead,
          activity: fallbackActivity,
          stats: listProgressStatsFromMap(zeroXp()),
        };
      }
    },
    updateLead: async (leadId, input) => {
      const ownerId = getOwnerId();
      const existingLead = await getLeadById(leadId);

      if (!existingLead) {
        return null;
      }

      const payload: Record<string, unknown> = {};

      if (typeof input.name === "string") payload.name = input.name;
      if (typeof input.company === "string") payload.company = input.company;
      if ("website" in input) payload.website = input.website ?? null;
      if ("source" in input) payload.source = input.source ?? null;
      if (input.priority) payload.priority = input.priority;
      if (input.status) payload.status = input.status;
      if ("notes" in input) payload.notes = input.notes ?? null;
      if ("nextAction" in input) payload.next_action = input.nextAction ?? null;
      if (input.commercial) {
        payload.commercial_profile = {
          ...(existingLead.commercial ?? createDefaultCommercialProfile(existingLead.priority)),
          ...input.commercial,
        };
      }
      if (input.delivery) {
        payload.delivery_profile = {
          ...(existingLead.delivery ?? createDefaultDeliveryProfile()),
          ...input.delivery,
        };
      }

      const { data, error } = await client
        .from("leads")
        .update(payload)
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(error, "Failed to update lead.");

      return data ? toLead(data as LeadRow) : null;
    },
    updateLeadWithActivity: async ({ leadId, patch, activity }) => {
      const lead = await (async () => {
        const ownerId = getOwnerId();
        const existingLead = await getLeadById(leadId);

        if (!existingLead) {
          return null;
        }

        const payload: Record<string, unknown> = {};

        if (typeof patch.name === "string") payload.name = patch.name;
        if (typeof patch.company === "string") payload.company = patch.company;
        if ("website" in patch) payload.website = patch.website ?? null;
        if ("source" in patch) payload.source = patch.source ?? null;
        if (patch.priority) payload.priority = patch.priority;
        if (patch.status) payload.status = patch.status;
        if ("notes" in patch) payload.notes = patch.notes ?? null;
        if ("nextAction" in patch) payload.next_action = patch.nextAction ?? null;
        if (patch.commercial) {
          payload.commercial_profile = {
            ...(existingLead.commercial ?? createDefaultCommercialProfile(existingLead.priority)),
            ...patch.commercial,
          };
        }
        if (patch.delivery) {
          payload.delivery_profile = {
            ...(existingLead.delivery ?? createDefaultDeliveryProfile()),
            ...patch.delivery,
          };
        }

        const { data, error } = await client
          .from("leads")
          .update(payload)
          .eq("owner_id", ownerId)
          .eq("id", leadId)
          .select(
            "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
          )
          .maybeSingle();

        assertNoError(error, "Failed to update lead.");

        return data ? toLead(data as LeadRow) : null;
      })();

      if (!lead) {
        return null;
      }

      const createdActivity = await (async () => {
        const ownerId = getOwnerId();
        const { data, error } = await client
          .from("activities")
          .insert({
            id: activity.id ?? createUuid(),
            owner_id: ownerId,
            entity_type: activity.entityType,
            entity_id: lead.id,
            kind: activity.kind,
            actor: activity.actor,
            message: activity.message,
            xp_awards: activity.xpAwards,
            created_at: activity.createdAt ?? nowIso(),
          })
          .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
          .single();

        assertNoError(error, "Failed to create activity.");

        return toActivity(data as ActivityRow);
      })();

      return { lead, activity: createdActivity };
    },
    updateLeadStatus: async (leadId, status) => {
      const ownerId = getOwnerId();
      const { data, error } = await client
        .from("leads")
        .update({ status })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(error, "Failed to update lead status.");

      return data ? toLead(data as LeadRow) : null;
    },
    applyResearchToLead: async (leadId, research) => {
      const ownerId = getOwnerId();
      const existingLead = await getLeadById(leadId);

      const { data, error } = await client
        .from("leads")
        .update({
          status: existingLead?.status === "new" ? "researching" : existingLead?.status ?? "researching",
          next_action: research.nextAction,
          research_payload: research,
          commercial_profile: existingLead?.commercial ?? createDefaultCommercialProfile(existingLead?.priority ?? "normal"),
          delivery_profile: existingLead?.delivery ?? createDefaultDeliveryProfile(),
          last_researched_at: nowIso(),
        })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(error, "Failed to apply lead research.");

      return data ? toLead(data as LeadRow) : null;
    },
    awardXp: async (xpAwards) => {
      const ownerId = getOwnerId();
      await ensureProgressionRow();

      const { data: currentRow, error: readError } = await client
        .from("progression_stats")
        .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
        .eq("owner_id", ownerId)
        .single();

      assertNoError(readError, "Failed to read progression stats before XP award.");

      const current = mapProgressionStatsRow(currentRow as ProgressionStatsRow);
      const next = {
        owner_id: ownerId,
        sales: current.sales + (xpAwards.sales ?? 0),
        delivery: current.delivery + (xpAwards.delivery ?? 0),
        content: current.content + (xpAwards.content ?? 0),
        systems: current.systems + (xpAwards.systems ?? 0),
        relationships: current.relationships + (xpAwards.relationships ?? 0),
        revenue: current.revenue + (xpAwards.revenue ?? 0),
        discipline: current.discipline + (xpAwards.discipline ?? 0),
      };

      const { data, error } = await client
        .from("progression_stats")
        .upsert(next, { onConflict: "owner_id" })
        .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
        .single();

      assertNoError(error, "Failed to award XP.");

      return listProgressStatsFromMap(mapProgressionStatsRow(data as ProgressionStatsRow));
    },
    createActivity: async (input) => {
      const ownerId = getOwnerId();
      const { data, error } = await client
        .from("activities")
        .insert({
          id: input.id ?? createUuid(),
          owner_id: ownerId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          kind: input.kind,
          actor: input.actor,
          message: input.message,
          xp_awards: input.xpAwards,
          created_at: input.createdAt ?? nowIso(),
        })
        .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
        .single();

      assertNoError(error, "Failed to create activity.");

      return toActivity(data as ActivityRow);
    },
    createAgentRun: async (input) => {
      const ownerId = getOwnerId();
      const { data, error } = await client
        .from("agent_runs")
        .insert({
          id: input.id ?? createUuid(),
          owner_id: ownerId,
          action: input.action,
          mode: input.mode,
          status: input.status,
          summary: input.summary,
          target_type: input.targetType,
          target_id: input.targetId,
          requires_approval: input.requiresApproval,
          prompt: input.prompt,
          error: input.error ?? null,
          started_at: input.startedAt ?? nowIso(),
          completed_at: input.completedAt ?? null,
        })
        .select(
          "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
        )
        .single();

      assertNoError(error, "Failed to create agent run.");

      return toAgentRun(data as AgentRunRow);
    },
    updateAgentRun: async (runId, updates) => {
      const ownerId = getOwnerId();
      const payload: Record<string, unknown> = {};

      if (updates.mode) payload.mode = updates.mode;
      if (updates.status) payload.status = updates.status;
      if (typeof updates.summary === "string") payload.summary = updates.summary;
      if (typeof updates.prompt === "string") payload.prompt = updates.prompt;
      if (typeof updates.completedAt === "string") payload.completed_at = updates.completedAt;
      if (typeof updates.error === "string") payload.error = updates.error;
      if (updates.error === undefined) payload.error = null;

      const { data, error } = await client
        .from("agent_runs")
        .update(payload)
        .eq("owner_id", ownerId)
        .eq("id", runId)
        .select(
          "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
        )
        .maybeSingle();

      assertNoError(error, "Failed to update agent run.");

      return data ? toAgentRun(data as AgentRunRow) : null;
    },
    startLeadResearchRun: async ({ leadId, run }) => {
      const ownerId = getOwnerId();
      const { data: leadRow, error: leadError } = await client
        .from("leads")
        .update({ status: "researching", updated_at: nowIso() })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(leadError, "Failed to mark lead as researching.");

      if (!leadRow) {
        return null;
      }

      const { data: runRow, error: runError } = await client
        .from("agent_runs")
        .insert({
          id: run.id ?? createUuid(),
          owner_id: ownerId,
          action: run.action,
          mode: run.mode,
          status: run.status,
          summary: run.summary,
          target_type: run.targetType,
          target_id: run.targetId,
          requires_approval: run.requiresApproval,
          prompt: run.prompt,
          error: run.error ?? null,
          started_at: run.startedAt ?? nowIso(),
          completed_at: run.completedAt ?? null,
        })
        .select(
          "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
        )
        .single();

      assertNoError(runError, "Failed to create agent run.");

      return { lead: toLead(leadRow as LeadRow), agentRun: toAgentRun(runRow as AgentRunRow) };
    },
    completeLeadResearch: async ({
      leadId,
      runId,
      research,
      leadStatusOnComplete = "qualified",
      runUpdates,
      activity,
      xpAwards,
    }) => {
      const ownerId = getOwnerId();
      const existingLead = await getLeadById(leadId);

      if (!existingLead) {
        return null;
      }

      const timestamp = nowIso();
      const { data: leadRow, error: leadError } = await client
        .from("leads")
        .update({
          status: leadStatusOnComplete,
          next_action: research.nextAction,
          research_payload: research,
          commercial_profile:
            existingLead.commercial ?? createDefaultCommercialProfile(existingLead.priority),
          delivery_profile: existingLead.delivery ?? createDefaultDeliveryProfile(),
          last_researched_at: timestamp,
          updated_at: timestamp,
        })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .single();

      assertNoError(leadError, "Failed to apply lead research.");

      const runPayload: Record<string, unknown> = {
        completed_at: runUpdates.completedAt ?? timestamp,
        error: runUpdates.error ?? null,
      };
      if (runUpdates.mode) runPayload.mode = runUpdates.mode;
      if (runUpdates.status) runPayload.status = runUpdates.status;
      if (typeof runUpdates.summary === "string") runPayload.summary = runUpdates.summary;
      if (typeof runUpdates.prompt === "string") runPayload.prompt = runUpdates.prompt;

      const { data: runRow, error: runError } = await client
        .from("agent_runs")
        .update(runPayload)
        .eq("owner_id", ownerId)
        .eq("id", runId)
        .select(
          "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
        )
        .single();

      assertNoError(runError, "Failed to update agent run.");

      const { data: activityRow, error: activityError } = await client
        .from("activities")
        .insert({
          id: activity.id ?? createUuid(),
          owner_id: ownerId,
          entity_type: activity.entityType,
          entity_id: leadId,
          kind: activity.kind,
          actor: activity.actor,
          message: activity.message,
          xp_awards: activity.xpAwards,
          created_at: activity.createdAt ?? timestamp,
        })
        .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
        .single();

      assertNoError(activityError, "Failed to create activity.");

      const stats = await (async () => {
        await ensureProgressionRow();
        const { data: currentRow, error: readError } = await client
          .from("progression_stats")
          .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
          .eq("owner_id", ownerId)
          .single();

        assertNoError(readError, "Failed to read progression stats before XP award.");

        const current = mapProgressionStatsRow(currentRow as ProgressionStatsRow);
        const next = {
          owner_id: ownerId,
          sales: current.sales + (xpAwards.sales ?? 0),
          delivery: current.delivery + (xpAwards.delivery ?? 0),
          content: current.content + (xpAwards.content ?? 0),
          systems: current.systems + (xpAwards.systems ?? 0),
          relationships: current.relationships + (xpAwards.relationships ?? 0),
          revenue: current.revenue + (xpAwards.revenue ?? 0),
          discipline: current.discipline + (xpAwards.discipline ?? 0),
        };

        const { data, error } = await client
          .from("progression_stats")
          .upsert(next, { onConflict: "owner_id" })
          .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
          .single();

        assertNoError(error, "Failed to award XP.");

        return listProgressStatsFromMap(mapProgressionStatsRow(data as ProgressionStatsRow));
      })();

      return {
        lead: toLead(leadRow as LeadRow),
        agentRun: toAgentRun(runRow as AgentRunRow),
        activity: toActivity(activityRow as ActivityRow),
        stats,
      };
    },
    failLeadResearch: async ({ leadId, runId, restoreStatus, runUpdates, activity }) => {
      const ownerId = getOwnerId();
      const timestamp = nowIso();
      const { data: leadRow, error: leadError } = await client
        .from("leads")
        .update({ status: restoreStatus, updated_at: timestamp })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(leadError, "Failed to restore lead status after research failure.");

      const runPayload: Record<string, unknown> = {
        completed_at: runUpdates.completedAt ?? timestamp,
        error: runUpdates.error ?? null,
      };
      if (runUpdates.mode) runPayload.mode = runUpdates.mode;
      if (runUpdates.status) runPayload.status = runUpdates.status;
      if (typeof runUpdates.summary === "string") runPayload.summary = runUpdates.summary;
      if (typeof runUpdates.prompt === "string") runPayload.prompt = runUpdates.prompt;

      const { data: runRow, error: runError } = await client
        .from("agent_runs")
        .update(runPayload)
        .eq("owner_id", ownerId)
        .eq("id", runId)
        .select(
          "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
        )
        .maybeSingle();

      assertNoError(runError, "Failed to update failed agent run.");

      let createdActivity: Activity | undefined;

      if (activity) {
        const { data, error } = await client
          .from("activities")
          .insert({
            id: activity.id ?? createUuid(),
            owner_id: ownerId,
            entity_type: activity.entityType,
            entity_id: activity.entityId,
            kind: activity.kind,
            actor: activity.actor,
            message: activity.message,
            xp_awards: activity.xpAwards,
            created_at: activity.createdAt ?? timestamp,
          })
          .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
          .single();

        assertNoError(error, "Failed to create activity.");
        createdActivity = toActivity(data as ActivityRow);
      }

      return {
        lead: leadRow ? toLead(leadRow as LeadRow) : null,
        agentRun: runRow ? toAgentRun(runRow as AgentRunRow) : null,
        activity: createdActivity,
      };
    },
    listApprovals: async () =>
      [...(await loadState()).approvals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    createApproval: async (input) => {
      const ownerId = getOwnerId();
      const { data, error } = await client
        .from("approvals")
        .insert({
          id: createUuid(),
          owner_id: ownerId,
          action: input.action,
          status: "pending",
          target_type: input.targetType,
          target_id: input.targetId,
          title: input.title,
          summary: input.summary,
          requested_by: "human",
          payload: input.payload,
        })
        .select("id, action, status, target_type, target_id, title, summary, requested_by, payload, created_at, resolved_at")
        .single();

      assertNoError(error, "Failed to create approval.");

      return toApproval(data as ApprovalRow);
    },
    resolveApproval: async (approvalId, decision) => {
      const ownerId = getOwnerId();
      const { data, error } = await client
        .from("approvals")
        .update({ status: decision, resolved_at: nowIso() })
        .eq("owner_id", ownerId)
        .eq("id", approvalId)
        .select("id, action, status, target_type, target_id, title, summary, requested_by, payload, created_at, resolved_at")
        .maybeSingle();

      assertNoError(error, "Failed to resolve approval.");

      return data ? toApproval(data as ApprovalRow) : null;
    },
    listClients: async () =>
      [...(await loadState()).clients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    promoteLeadToClient: async (leadId, input = {}) => {
      const ownerId = getOwnerId();
      const lead = await getLeadById(leadId);

      if (!lead) {
        return null;
      }

      const { data: existingClientRow, error: existingError } = await client
        .from("clients")
        .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
        .eq("owner_id", ownerId)
        .eq("lead_id", leadId)
        .maybeSingle();

      assertNoError(existingError, "Failed to inspect existing client.");

      const existingClient = existingClientRow ? toClient(existingClientRow as ClientRow) : null;
      const auditNotes = [
        ...(existingClient?.auditNotes ?? []),
        input.auditNote ?? lead.research?.overview ?? lead.notes ?? "Lead promoted into client delivery.",
      ];
      const deliveryRoadmap = [
        ...(existingClient?.deliveryRoadmap ?? []),
        input.roadmapItem ??
          lead.delivery?.nextDeliverable ??
          lead.research?.recommendedOffer ??
          "Confirm delivery roadmap.",
      ];
      const payload = {
        id: existingClient?.id ?? createUuid(),
        owner_id: ownerId,
        lead_id: leadId,
        company: lead.company,
        status: existingClient?.status ?? "active",
        audit_notes: auditNotes,
        delivery_roadmap: deliveryRoadmap,
      };
      const { data: clientRow, error: clientError } = await client
        .from("clients")
        .upsert(payload, { onConflict: "id" })
        .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
        .single();

      assertNoError(clientError, "Failed to promote lead to client.");

      const { data: updatedLeadRow, error: leadError } = await client
        .from("leads")
        .update({
          status: lead.status === "won" ? "won" : "proposal",
          delivery_profile: lead.delivery ?? createDefaultDeliveryProfile(),
        })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(leadError, "Failed to update promoted lead.");

      const updatedLead = updatedLeadRow ? toLead(updatedLeadRow as LeadRow) : lead;

      return { client: toClient(clientRow as ClientRow), lead: updatedLead };
    },
    promoteLeadWithActivity: async ({ leadId, promotion, activity }) => {
      const promoted = await (async () => {
        const ownerId = getOwnerId();
        const lead = await getLeadById(leadId);

        if (!lead) {
          return null;
        }

        const { data: existingClientRow, error: existingError } = await client
          .from("clients")
          .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
          .eq("owner_id", ownerId)
          .eq("lead_id", leadId)
          .maybeSingle();

        assertNoError(existingError, "Failed to inspect existing client.");

        const existingClient = existingClientRow ? toClient(existingClientRow as ClientRow) : null;
        const auditNotes = [
          ...(existingClient?.auditNotes ?? []),
          promotion?.auditNote ??
            lead.research?.overview ??
            lead.notes ??
            "Lead promoted into client delivery.",
        ];
        const deliveryRoadmap = [
          ...(existingClient?.deliveryRoadmap ?? []),
          promotion?.roadmapItem ??
            lead.delivery?.nextDeliverable ??
            lead.research?.recommendedOffer ??
            "Confirm delivery roadmap.",
        ];
        const payload = {
          id: existingClient?.id ?? createUuid(),
          owner_id: ownerId,
          lead_id: leadId,
          company: lead.company,
          status: existingClient?.status ?? "active",
          audit_notes: auditNotes,
          delivery_roadmap: deliveryRoadmap,
        };
        const { data: clientRow, error: clientError } = await client
          .from("clients")
          .upsert(payload, { onConflict: "id" })
          .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
          .single();

        assertNoError(clientError, "Failed to promote lead to client.");

        const { data: updatedLeadRow, error: leadError } = await client
          .from("leads")
          .update({
            status: lead.status === "won" ? "won" : "proposal",
            delivery_profile: lead.delivery ?? createDefaultDeliveryProfile(),
          })
          .eq("owner_id", ownerId)
          .eq("id", leadId)
          .select(
            "id, name, company, website, source, priority, status, notes, next_action, research_payload, commercial_profile, delivery_profile, last_researched_at, created_at, updated_at",
          )
          .maybeSingle();

        assertNoError(leadError, "Failed to update promoted lead.");

        return {
          client: toClient(clientRow as ClientRow),
          lead: updatedLeadRow ? toLead(updatedLeadRow as LeadRow) : lead,
        };
      })();

      if (!promoted) {
        return null;
      }

      const createdActivity = await (async () => {
        const ownerId = getOwnerId();
        const { data, error } = await client
          .from("activities")
          .insert({
            id: activity.id ?? createUuid(),
            owner_id: ownerId,
            entity_type: activity.entityType,
            entity_id: promoted.lead.id,
            kind: activity.kind,
            actor: activity.actor,
            message: activity.message,
            xp_awards: activity.xpAwards,
            created_at: activity.createdAt ?? nowIso(),
          })
          .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
          .single();

        assertNoError(error, "Failed to create activity.");

        return toActivity(data as ActivityRow);
      })();

      return { ...promoted, activity: createdActivity };
    },
    updateClient: async (clientId, input) => {
      const ownerId = getOwnerId();
      const { data: currentRow, error: currentError } = await client
        .from("clients")
        .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
        .eq("owner_id", ownerId)
        .eq("id", clientId)
        .maybeSingle();

      assertNoError(currentError, "Failed to load client before update.");

      if (!currentRow) {
        return null;
      }

      const current = toClient(currentRow as ClientRow);
      const { data, error } = await client
        .from("clients")
        .update({
          status: input.status ?? current.status,
          audit_notes: input.auditNote ? [...current.auditNotes, input.auditNote] : current.auditNotes,
          delivery_roadmap: input.roadmapItem
            ? [...current.deliveryRoadmap, input.roadmapItem]
            : current.deliveryRoadmap,
        })
        .eq("owner_id", ownerId)
        .eq("id", clientId)
        .select("id, lead_id, company, status, audit_notes, delivery_roadmap, created_at, updated_at")
        .maybeSingle();

      assertNoError(error, "Failed to update client.");

      return data ? toClient(data as ClientRow) : null;
    },
    listTemplates: async () =>
      [...(await loadState()).templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    createTemplate: async (input) => {
      const ownerId = getOwnerId();
      const { data, error } = await client
        .from("templates")
        .insert({
          id: createUuid(),
          owner_id: ownerId,
          title: input.title,
          category: input.category,
          body: input.body,
          metadata: { version: 1, archived: false },
        })
        .select("id, title, category, body, metadata, created_at, updated_at")
        .single();

      assertNoError(error, "Failed to create template.");

      return toTemplate(data as TemplateRow);
    },
    updateTemplate: async (templateId, input) => {
      const ownerId = getOwnerId();
      const { data: currentRow, error: currentError } = await client
        .from("templates")
        .select("id, title, category, body, metadata, created_at, updated_at")
        .eq("owner_id", ownerId)
        .eq("id", templateId)
        .maybeSingle();

      assertNoError(currentError, "Failed to load template before update.");

      if (!currentRow) {
        return null;
      }

      const current = toTemplate(currentRow as TemplateRow);
      const { data, error } = await client
        .from("templates")
        .update({
          title: input.title ?? current.title,
          category: input.category ?? current.category,
          body: input.body ?? current.body,
          metadata: {
            version: input.body && input.body !== current.body ? current.version + 1 : current.version,
            archived: input.archived ?? current.archived,
          },
        })
        .eq("owner_id", ownerId)
        .eq("id", templateId)
        .select("id, title, category, body, metadata, created_at, updated_at")
        .maybeSingle();

      assertNoError(error, "Failed to update template.");

      return data ? toTemplate(data as TemplateRow) : null;
    },
  };
};

export const createConfiguredUtopiaRepository = (): UtopiaRepository => {
  const config = getPersistenceConfigState();

  if (!config.supabaseConfigured) {
    const missingEnvVars = getMissingPersistenceEnvVars(config);
    throw new Error(
      `Supabase persistence is required. Missing environment variables: ${missingEnvVars.join(", ")}.`,
    );
  }

  return createSupabaseUtopiaRepository();
};
