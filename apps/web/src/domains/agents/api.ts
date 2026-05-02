import type { SystemStatus } from "@utopia/schemas";

import { request } from "@/lib/api";

export const agentsApi = {
  getStatus: () => request<SystemStatus>("/api/system/status"),
};
