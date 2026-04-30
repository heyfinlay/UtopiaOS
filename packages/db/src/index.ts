import { randomUUID } from "node:crypto";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
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

export type UtopiaRepository = ReturnType<typeof createUtopiaRepository>;

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
      value: leads.filter((lead) =>
        ["proposal", "won"].includes(lead.status),
      ).length,
      trend: "Late-stage pipeline pressure",
    },
  ];
};

export const createUtopiaRepository = (initialState: UtopiaState = createSeedState()) => {
  let state: UtopiaState = {
    leads: sortLeads(initialState.leads),
    activities: [...initialState.activities],
    agentRuns: [...initialState.agentRuns],
    statXp: { ...initialState.statXp },
  };

  const listProgressStats = (): ProgressStat[] =>
    (Object.keys(state.statXp) as StatKey[]).map((key) =>
      buildProgressStat(key, state.statXp[key]),
    );

  const getFeaturedLead = () =>
    state.leads.find((lead) => !lead.research) ?? state.leads[0] ?? null;

  const getDashboardSummary = (): DashboardSummary =>
    dashboardSummarySchema.parse({
      generatedAt: nowIso(),
      mainQuest: {
        title: "Research the hottest lead and lock the next revenue move.",
        description:
          getFeaturedLead()?.nextAction ??
          "Keep the mission board clean by creating or researching the next lead.",
        xpReward: 45,
      },
      missions: buildMissions(state),
      pipeline: buildPipeline(state),
      stats: listProgressStats(),
      recentActivity: [...state.activities].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ).slice(0, 6),
      agentRuns: [...state.agentRuns].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      ).slice(0, 4),
      featuredLead: getFeaturedLead(),
    });

  const listLeads = () => sortLeads(state.leads);

  const getLead = (leadId: string) =>
    state.leads.find((lead) => lead.id === leadId) ?? null;

  const createLead = (input: CreateLeadInput) => {
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
  };

  const updateLeadStatus = (leadId: string, status: Lead["status"]) => {
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
  };

  const applyResearchToLead = (leadId: string, research: ResearchLeadResult) => {
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
  };

  const awardXp = (xpAwards: Partial<StatXpMap>) => {
    state = {
      ...state,
      statXp: {
        ...state.statXp,
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
  };

  const createActivity = (input: CreateActivityInput) => {
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
  };

  const createAgentRun = (input: CreateAgentRunInput) => {
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
  };

  const updateAgentRun = (runId: string, updates: Partial<AgentRun>) => {
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
  };

  const reset = () => {
    state = createSeedState();
  };

  return {
    reset,
    getDashboardSummary,
    listProgressStats,
    listLeads,
    getLead,
    createLead,
    updateLeadStatus,
    applyResearchToLead,
    awardXp,
    createActivity,
    createAgentRun,
    updateAgentRun,
  };
};

export const utopiaRepository = createUtopiaRepository();
