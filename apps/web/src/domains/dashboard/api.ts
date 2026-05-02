import type { DashboardSummary } from "@utopia/schemas";

import { request } from "@/lib/api";

export const dashboardApi = {
  get: () => request<DashboardSummary>("/api/dashboard"),
};
