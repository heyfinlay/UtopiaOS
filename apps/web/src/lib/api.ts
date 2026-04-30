import type {
  CreateLeadInput,
  CreateLeadResponse,
  DashboardSummary,
  ImportLeadsInput,
  ImportLeadsResponse,
  Lead,
  ProgressStat,
  ResearchLeadResponse,
  SystemStatus,
} from "@utopia/schemas";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export type LeadsResponse = {
  leads: Lead[];
  stats: ProgressStat[];
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new ApiError(
      payload?.error ?? `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  getDashboard: () => request<DashboardSummary>("/api/dashboard"),
  getLeads: () => request<LeadsResponse>("/api/leads"),
  getLead: (leadId: string) => request<{ lead: Lead }>(`/api/leads/${leadId}`),
  getSystemStatus: () => request<SystemStatus>("/api/system/status"),
  createLead: (payload: CreateLeadInput) =>
    request<CreateLeadResponse>("/api/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  importLeads: (payload: ImportLeadsInput) =>
    request<ImportLeadsResponse>("/api/leads/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  researchLead: (leadId: string) =>
    request<ResearchLeadResponse>(`/api/leads/${leadId}/research`, {
      method: "POST",
    }),
};
