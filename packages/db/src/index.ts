import { randomUUID } from "node:crypto";
import process from "node:process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  activitySchema,
  agentRunSchema,
  dashboardSummarySchema,
  type Activity,
  type AgentRun,
  type CreateLeadInput,
  type DashboardSummary,
  type Lead,
  type Mission,
  type ProgressStat,
  type ResearchLeadResult,
  type StatKey,
  leadSchema,
  researchLeadResultSchema,
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
  getDashboardSummary: () => Promise<DashboardSummary>;
  listProgressStats: () => Promise<ProgressStat[]>;
  listLeads: () => Promise<Lead[]>;
  getLead: (leadId: string) => Promise<Lead | null>;
  createLead: (input: CreateLeadInput) => Promise<Lead>;
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
  mode: "mock" | "mock-fallback" | "openclaw-cli";
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
  supabaseUrl = process.env.SUPABASE_URL,
  supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
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

const priorityWeight: Record<Lead["priority"], number> = {
  critical: 3,
  high: 2,
  normal: 1,
};

const nowIso = () => new Date().toISOString();

const compact = (parts: Array<string | undefined>) => parts.filter(Boolean).join(" ");

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

const createSeedState = (): UtopiaState => {
  const seedTime = nowIso();
  const researchedLead: Lead = leadSchema.parse({
    id: randomUUID(),
    name: "Mia Ortega",
    company: "Northline Studio",
    website: "https://northlinestudio.co",
    source: "Referral from design founder network",
    priority: "high",
    status: "researching",
    notes: "Interested in reducing proposal turnaround and client onboarding drag.",
    nextAction: "Send a 4-line note with an audit teaser and onboarding automation example.",
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
    id: randomUUID(),
    name: "Eli Bennett",
    company: "Harbor Ridge Advisory",
    website: "https://harborridgeadvisory.com",
    source: "LinkedIn outbound reply",
    priority: "critical",
    status: "new",
    notes: "Mentioned manual reporting and a stretched ops coordinator.",
    nextAction: "Run AI research and shape a wedge offer around reporting automation.",
    createdAt: seedTime,
    updatedAt: seedTime,
  });

  const activities: Activity[] = [
    activitySchema.parse({
      id: randomUUID(),
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
  ];

  const agentRuns: AgentRun[] = [
    agentRunSchema.parse({
      id: randomUUID(),
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

  return {
    leads: sortLeads([researchedLead, newLead]),
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

const listProgressStatsFromMap = (statXp: StatXpMap): ProgressStat[] =>
  (Object.keys(statXp) as StatKey[]).map((key) => buildProgressStat(key, statXp[key]));

const getFeaturedLead = (state: UtopiaState) =>
  state.leads.find((lead) => !lead.research) ?? state.leads[0] ?? null;

const buildDashboardSummary = (state: UtopiaState): DashboardSummary =>
  dashboardSummarySchema.parse({
    generatedAt: nowIso(),
    mainQuest: {
      title: "Research the hottest lead and lock the next revenue move.",
      description:
        getFeaturedLead(state)?.nextAction ??
        "Keep the mission board clean by creating or researching the next lead.",
      xpReward: 45,
    },
    missions: buildMissions(state),
    pipeline: buildPipeline(state),
    stats: listProgressStatsFromMap(state.statXp),
    recentActivity: [...state.activities]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    agentRuns: [...state.agentRuns]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 4),
    featuredLead: getFeaturedLead(state),
  });

const normalizeOptionalString = (value: string | null | undefined) =>
  value?.trim() ? value : undefined;

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
    lastResearchedAt: row.last_researched_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    createdAt: row.created_at,
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
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    error: normalizeOptionalString(row.error),
  });

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
    getDashboardSummary: async () => buildDashboardSummary(state),
    listProgressStats,
    listLeads: async () => sortLeads(state.leads),
    getLead: async (leadId) => state.leads.find((lead) => lead.id === leadId) ?? null,
    createLead: async (input) => {
      const timestamp = nowIso();
      const lead = leadSchema.parse({
        id: randomUUID(),
        ...input,
        status: "new",
        nextAction: "Run AI research to sharpen the first outreach angle.",
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      state = {
        ...state,
        leads: sortLeads([lead, ...state.leads]),
      };

      return lead;
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
        id: input.id ?? randomUUID(),
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
        id: input.id ?? randomUUID(),
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
  };
};

export const createUtopiaRepository = createMemoryUtopiaRepository;

export const createSupabaseUtopiaRepository = ({
  client = createSupabaseAdminClient(),
  ownerId = process.env.UTOPIA_OWNER_ID,
}: SupabaseRepositoryOptions = {}): UtopiaRepository => {
  if (!ownerId) {
    throw new Error("Missing UTOPIA_OWNER_ID for the Supabase repository.");
  }

  const ensureProgressionRow = async () => {
    const { error } = await client
      .from("progression_stats")
      .upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true });

    assertNoError(error, "Failed to ensure progression stats row.");
  };

  const loadState = async (): Promise<UtopiaState> => {
    await ensureProgressionRow();

    const [{ data: leadRows, error: leadsError }, { data: activityRows, error: activitiesError }, { data: agentRunRows, error: agentRunsError }, { data: progressionRow, error: progressionError }] =
      await Promise.all([
        client
          .from("leads")
          .select(
            "id, name, company, website, source, priority, status, notes, next_action, research_payload, last_researched_at, created_at, updated_at",
          )
          .eq("owner_id", ownerId),
        client
          .from("activities")
          .select("id, entity_type, entity_id, kind, actor, message, xp_awards, created_at")
          .eq("owner_id", ownerId),
        client
          .from("agent_runs")
          .select(
            "id, action, mode, status, summary, target_type, target_id, requires_approval, prompt, started_at, completed_at, error",
          )
          .eq("owner_id", ownerId),
        client
          .from("progression_stats")
          .select("owner_id, sales, delivery, content, systems, relationships, revenue, discipline")
          .eq("owner_id", ownerId)
          .maybeSingle(),
      ]);

    assertNoError(leadsError, "Failed to load leads.");
    assertNoError(activitiesError, "Failed to load activities.");
    assertNoError(agentRunsError, "Failed to load agent runs.");
    assertNoError(progressionError, "Failed to load progression stats.");

    return {
      leads: sortLeads(((leadRows ?? []) as LeadRow[]).map(toLead)),
      activities: ((activityRows ?? []) as ActivityRow[]).map(toActivity),
      agentRuns: ((agentRunRows ?? []) as AgentRunRow[]).map(toAgentRun),
      statXp: mapProgressionStatsRow(progressionRow as ProgressionStatsRow | null),
    };
  };

  const listProgressStats = async () => {
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
    const { data, error } = await client
      .from("leads")
      .select(
        "id, name, company, website, source, priority, status, notes, next_action, research_payload, last_researched_at, created_at, updated_at",
      )
      .eq("owner_id", ownerId)
      .eq("id", leadId)
      .maybeSingle();

    assertNoError(error, "Failed to fetch lead.");

    return data ? toLead(data as LeadRow) : null;
  };

  return {
    mode: "supabase",
    reset: async () => {
      throw new Error("Reset is only available for the in-memory repository.");
    },
    getDashboardSummary: async () => buildDashboardSummary(await loadState()),
    listProgressStats,
    listLeads: async () => (await loadState()).leads,
    getLead: getLeadById,
    createLead: async (input) => {
      const { data, error } = await client
        .from("leads")
        .insert({
          owner_id: ownerId,
          name: input.name,
          company: input.company,
          website: input.website ?? null,
          source: input.source ?? null,
          priority: input.priority,
          status: "new",
          notes: input.notes ?? null,
          next_action: "Run AI research to sharpen the first outreach angle.",
          research_payload: {},
        })
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, last_researched_at, created_at, updated_at",
        )
        .single();

      assertNoError(error, "Failed to create lead.");

      return toLead(data as LeadRow);
    },
    updateLeadStatus: async (leadId, status) => {
      const { data, error } = await client
        .from("leads")
        .update({ status })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(error, "Failed to update lead status.");

      return data ? toLead(data as LeadRow) : null;
    },
    applyResearchToLead: async (leadId, research) => {
      const existingLead = await getLeadById(leadId);

      const { data, error } = await client
        .from("leads")
        .update({
          status: existingLead?.status === "new" ? "researching" : existingLead?.status ?? "researching",
          next_action: research.nextAction,
          research_payload: research,
          last_researched_at: nowIso(),
        })
        .eq("owner_id", ownerId)
        .eq("id", leadId)
        .select(
          "id, name, company, website, source, priority, status, notes, next_action, research_payload, last_researched_at, created_at, updated_at",
        )
        .maybeSingle();

      assertNoError(error, "Failed to apply lead research.");

      return data ? toLead(data as LeadRow) : null;
    },
    awardXp: async (xpAwards) => {
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
      const { data, error } = await client
        .from("activities")
        .insert({
          id: input.id ?? randomUUID(),
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
      const { data, error } = await client
        .from("agent_runs")
        .insert({
          id: input.id ?? randomUUID(),
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
  };
};

export const createConfiguredUtopiaRepository = (): UtopiaRepository => {
  const hasSupabaseConfig = Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      process.env.UTOPIA_OWNER_ID?.trim(),
  );

  if (hasSupabaseConfig) {
    return createSupabaseUtopiaRepository();
  }

  return createMemoryUtopiaRepository();
};

export const utopiaRepository = createConfiguredUtopiaRepository();
