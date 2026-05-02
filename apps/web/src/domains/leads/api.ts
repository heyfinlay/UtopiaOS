import type {
  ClientResponse,
  CreateLeadInput,
  CreateLeadResponse,
  ImportLeadsInput,
  ImportLeadsResponse,
  Lead,
  UpdateLeadInput,
  UpdateLeadResponse,
  ResearchLeadResponse,
} from "@utopia/schemas";

import { request, type LeadsResponse } from "@/lib/api";

export const leadsApi = {
  list: () => request<LeadsResponse>("/api/leads"),
  get: (leadId: string) => request<{ lead: Lead }>(`/api/leads/${leadId}`),
  create: (payload: CreateLeadInput) =>
    request<CreateLeadResponse>("/api/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  import: (payload: ImportLeadsInput) =>
    request<ImportLeadsResponse>("/api/leads/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (leadId: string, payload: UpdateLeadInput) =>
    request<UpdateLeadResponse>(`/api/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  promote: (leadId: string, payload: { auditNote?: string; roadmapItem?: string }) =>
    request<ClientResponse>(`/api/leads/${leadId}/promote`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  research: (leadId: string) =>
    request<ResearchLeadResponse>(`/api/leads/${leadId}/research`, {
      method: "POST",
    }),
};
