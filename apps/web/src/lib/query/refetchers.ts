import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";

export const refetchAfterLeadCreate = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  ]);

export const refetchAfterLeadUpdate = (queryClient: QueryClient, leadId?: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
    ...(leadId ? [queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) })] : []),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  ]);

export const refetchAfterLeadResearch = (queryClient: QueryClient, leadId?: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
    ...(leadId ? [queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) })] : []),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.systemStatus() }),
  ]);

export const refetchAfterLeadPromotion = (queryClient: QueryClient, leadId?: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
    ...(leadId ? [queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) })] : []),
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  ]);

export const refetchAfterApprovalChange = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  ]);

export const refetchAfterTemplateChange = (queryClient: QueryClient) =>
  Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.templates.all() })]);

export const refetchAfterClientUpdate = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  ]);
