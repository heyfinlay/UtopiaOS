import type {
  ApprovalResponse,
  ApprovalsResponse,
  ClientResponse,
  ClientsResponse,
  CreateLeadInput,
  CreateLeadResponse,
  CreateTemplateInput,
  DashboardSummary,
  ImportLeadsInput,
  ImportLeadsResponse,
  Lead,
  ProgressStat,
  RequestApprovalInput,
  ResearchLeadResponse,
  SystemStatus,
  TemplateResponse,
  TemplatesResponse,
  UpdateClientInput,
  UpdateLeadInput,
  UpdateLeadResponse,
  UpdateTemplateInput,
} from "@utopia/schemas";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");

export const API_UNAUTHORIZED_EVENT = "utopia:api:unauthorized";

export type LeadsResponse = {
  leads: Lead[];
  stats: ProgressStat[];
};

type AccessTokenProvider = () => Promise<string | null> | string | null;
type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
  timeoutMessage?: string;
};

let accessTokenProvider: AccessTokenProvider | null = null;

export class ApiError extends Error {
  status: number;
  requestId?: string;
  payload?: unknown;
  method: string;
  path: string;

  constructor(options: {
    message: string;
    status: number;
    method: string;
    path: string;
    requestId?: string;
    payload?: unknown;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.method = options.method;
    this.path = options.path;
    this.requestId = options.requestId;
    this.payload = options.payload;
  }
}

export const setAccessTokenProvider = (provider: AccessTokenProvider | null) => {
  accessTokenProvider = provider;
};

const toSafeObject = (value: unknown) =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;

const toErrorMessage = (status: number, method: string, path: string, payload: unknown) => {
  const objectPayload = toSafeObject(payload);
  const payloadMessage =
    typeof objectPayload?.message === "string"
      ? objectPayload.message
      : typeof objectPayload?.error === "string"
        ? objectPayload.error
        : null;

  if (payloadMessage) {
    return payloadMessage;
  }

  switch (status) {
    case 401:
      return "Authentication failed. Sign in again to continue.";
    case 404:
      return `${method} ${path} returned 404. The API route or record was not found.`;
    case 405:
      return `${method} ${path} returned 405. The API function was not reached; check deployment routing and allowed methods.`;
    case 500:
      return "The API failed while handling this request. Check the server logs and request ID.";
    default:
      return `Request failed with status ${status}.`;
  }
};

const parseResponseBody = async (response: Response) => {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return {
      raw: rawText,
    };
  }
};

const isAbortFromTimeout = (
  error: unknown,
  timeoutController: AbortController | null,
) =>
  Boolean(
    timeoutController?.signal.aborted &&
      error instanceof Error &&
      error.name === "AbortError",
  );

const clearRequestTimeout = (timeout?: ReturnType<typeof globalThis.setTimeout>) => {
  if (timeout) {
    globalThis.clearTimeout(timeout);
  }
};

export async function request<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const accessToken = accessTokenProvider ? await accessTokenProvider() : null;
  const { timeoutMs, timeoutMessage, ...fetchInit } = init ?? {};
  const timeoutController =
    typeof timeoutMs === "number" && timeoutMs > 0 ? new AbortController() : null;
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  let response: Response;

  try {
    if (timeoutController) {
      timeout = globalThis.setTimeout(() => {
        timeoutController.abort();
      }, timeoutMs);
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(fetchInit.headers ?? {}),
      },
      ...fetchInit,
      signal: timeoutController?.signal ?? fetchInit.signal,
    });
  } catch (error) {
    const abortedByTimeout = isAbortFromTimeout(error, timeoutController);
    clearRequestTimeout(timeout);

    throw new ApiError({
      message:
        abortedByTimeout
          ? (timeoutMessage ?? "Request timed out. Please try again.")
          : error instanceof Error
          ? `The backend was unreachable: ${error.message}`
          : "The backend was unreachable.",
      status: 0,
      method,
      path,
    });
  }

  let payload: unknown;

  try {
    payload = await parseResponseBody(response);
  } catch (error) {
    const requestId = response.headers.get("x-request-id") ?? undefined;
    const abortedByTimeout = isAbortFromTimeout(error, timeoutController);

    throw new ApiError({
      message: abortedByTimeout
        ? (timeoutMessage ?? "Request timed out. Please try again.")
        : error instanceof Error
          ? `The backend response could not be read: ${error.message}`
          : "The backend response could not be read.",
      status: response.status,
      method,
      path,
      requestId,
    });
  } finally {
    clearRequestTimeout(timeout);
  }

  const objectPayload = toSafeObject(payload);
  const requestId =
    response.headers.get("x-request-id") ??
    (typeof objectPayload?.requestId === "string" ? objectPayload.requestId : undefined);

  if (!response.ok) {
    const message = toErrorMessage(response.status, method, path, payload);

    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(API_UNAUTHORIZED_EVENT, {
          detail: {
            message,
            requestId,
          },
        }),
      );
    }

    throw new ApiError({
      message,
      status: response.status,
      method,
      path,
      requestId,
      payload,
    });
  }

  return payload as T;
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
      timeoutMs: 15_000,
      timeoutMessage: "Lead deployment timed out. Please try again.",
      body: JSON.stringify(payload),
    }),
  importLeads: (payload: ImportLeadsInput) =>
    request<ImportLeadsResponse>("/api/leads/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLead: (leadId: string, payload: UpdateLeadInput) =>
    request<UpdateLeadResponse>(`/api/leads/${leadId}`, {
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
