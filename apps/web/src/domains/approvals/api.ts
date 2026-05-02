import type { ApprovalResponse, ApprovalsResponse, RequestApprovalInput } from "@utopia/schemas";

import { request } from "@/lib/api";

export const approvalsApi = {
  list: () => request<ApprovalsResponse>("/api/approvals"),
  create: (payload: RequestApprovalInput) =>
    request<ApprovalResponse>("/api/approvals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resolve: (approvalId: string, decision: "approved" | "rejected") =>
    request<ApprovalResponse>(`/api/approvals/${approvalId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),
};
