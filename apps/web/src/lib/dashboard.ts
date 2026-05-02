import type { DashboardSummary, Lead } from "@utopia/schemas";

export const leadColumnOrder: Array<Lead["status"]> = [
  "new",
  "researching",
  "qualified",
  "proposal",
];

export const leadColumnLabels: Record<Lead["status"], string> = {
  new: "Recon Queue",
  researching: "Researching",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export function totalXp(stats: DashboardSummary["stats"]) {
  return stats.reduce((sum: number, stat: DashboardSummary["stats"][number]) => sum + stat.xp, 0);
}

export function groupLeadsByStatus(leads: Lead[]) {
  return leadColumnOrder.map((status) => ({
    status,
    label: leadColumnLabels[status],
    leads: leads.filter((lead) => lead.status === status),
  }));
}

export function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(isoDate));
}

export function describePriority(priority: Lead["priority"]) {
  return priority === "critical"
    ? "Critical"
    : priority === "high"
      ? "High"
      : "Normal";
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
