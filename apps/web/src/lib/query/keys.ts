export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  systemStatus: () => ["system-status"] as const,
  leads: {
    all: () => ["leads"] as const,
    detail: (leadId: string) => ["leads", leadId] as const,
  },
  clients: {
    all: () => ["clients"] as const,
  },
  approvals: {
    all: () => ["approvals"] as const,
  },
  templates: {
    all: () => ["templates"] as const,
  },
  agents: {
    status: () => ["agents", "status"] as const,
    runs: () => ["agents", "runs"] as const,
  },
} as const;
