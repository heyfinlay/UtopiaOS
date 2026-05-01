import type {
  ApprovalResponse,
  ApprovalsResponse,
  ClientResponse,
  ClientsResponse,
  CreateTemplateInput,
  CreateLeadInput,
  CreateLeadResponse,
  DashboardSummary,
  ImportLeadsInput,
  ImportLeadsResponse,
  Lead,
  ProgressStat,
  RequestApprovalInput,
  ResearchLeadResponse,
  TemplateResponse,
  TemplatesResponse,
  SystemStatus,
  UpdateClientInput,
  UpdateLeadInput,
  UpdateTemplateInput,
} from "@utopia/schemas";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");

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
  getApprovals: () => request<ApprovalsResponse>("/api/approvals"),
  getClients: () => request<ClientsResponse>("/api/clients"),
  getTemplates: () => request<TemplatesResponse>("/api/templates"),
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
  updateLead: (leadId: string, payload: UpdateLeadInput) =>
    request<{ lead: Lead }>(`/api/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  promoteLead: (leadId: string, payload: { auditNote?: string; roadmapItem?: string }) =>
    request<ClientResponse>(`/api/leads/${leadId}/promote`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  researchLead: (leadId: string) =>
    request<ResearchLeadResponse>(`/api/leads/${leadId}/research`, {
      method: "POST",
    }),
  requestApproval: (payload: RequestApprovalInput) =>
    request<ApprovalResponse>("/api/approvals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resolveApproval: (approvalId: string, decision: "approved" | "rejected") =>
    request<ApprovalResponse>(`/api/approvals/${approvalId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),
  updateClient: (clientId: string, payload: UpdateClientInput) =>
    request<ClientResponse>(`/api/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createTemplate: (payload: CreateTemplateInput) =>
    request<TemplateResponse>("/api/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTemplate: (templateId: string, payload: UpdateTemplateInput) =>
    request<TemplateResponse>(`/api/templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
