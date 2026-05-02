import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  Radar,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { approvalsApi } from "@/domains/approvals/api";
import { leadsApi } from "@/domains/leads/api";
import {
  describePriority,
  formatCompactCurrency,
  formatDate,
  groupLeadsByStatus,
  leadColumnLabels,
} from "@/lib/dashboard";
import { queryKeys } from "@/lib/query/keys";
import {
  refetchAfterApprovalChange,
  refetchAfterLeadPromotion,
  refetchAfterLeadResearch,
  refetchAfterLeadUpdate,
} from "@/lib/query/refetchers";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

export function LeadsPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const leadSearch = useUiStore((state) => state.leadSearch);
  const priorityFilter = useUiStore((state) => state.priorityFilter);
  const setLeadSearch = useUiStore((state) => state.setLeadSearch);
  const setPriorityFilter = useUiStore((state) => state.setPriorityFilter);
  const setCreateLeadOpen = useUiStore((state) => state.setCreateLeadOpen);
  const setImportLeadsOpen = useUiStore((state) => state.setImportLeadsOpen);
  const deferredSearch = useDeferredValue(leadSearch);
  const [leadDraft, setLeadDraft] = useState({
    status: "new",
    priority: "normal",
    nextAction: "",
    notes: "",
    weightedValue: "",
    invoiceOutstanding: "",
    nextRevenueMilestone: "",
    deliveryStage: "backlog",
    nextDeliverable: "",
    dueLabel: "",
    riskLevel: "low",
  });

  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: leadsApi.list,
  });

  const researchMutation = useMutation({
    mutationFn: leadsApi.research,
    onSuccess: async ({ lead }) => {
      await refetchAfterLeadResearch(queryClient, lead.id);
      toast.success(`${lead.company} researched and updated.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Research failed.");
    },
  });

  const allLeads = leadsQuery.data?.leads ?? [];
  const filteredLeads = allLeads.filter((lead) => {
    const matchesPriority =
      priorityFilter === "all" ? true : lead.priority === priorityFilter;
    const matchesSearch =
      deferredSearch.trim().length === 0
        ? true
        : `${lead.company} ${lead.name} ${lead.source ?? ""} ${lead.notes ?? ""}`
            .toLowerCase()
            .includes(deferredSearch.toLowerCase());

    return matchesPriority && matchesSearch;
  });

  const selectedLead =
    filteredLeads.find((lead) => lead.id === leadId) ?? filteredLeads[0] ?? null;
  const weightedPipeline = filteredLeads.reduce(
    (sum, lead) => sum + (lead.commercial?.weightedValue ?? 0),
    0,
  );
  const outstandingInvoices = filteredLeads.reduce(
    (sum, lead) => sum + (lead.commercial?.invoiceOutstanding ?? 0),
    0,
  );
  const activeDeliveryCount = filteredLeads.filter(
    (lead) => (lead.delivery?.completionPercent ?? 0) > 0 && lead.status !== "lost",
  ).length;

  useEffect(() => {
    if (!leadId && filteredLeads[0]) {
      startTransition(() => navigate(`/leads/${filteredLeads[0].id}`, { replace: true }));
    }
  }, [filteredLeads, leadId, navigate]);

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeadDraft({
      status: selectedLead.status,
      priority: selectedLead.priority,
      nextAction: selectedLead.nextAction ?? "",
      notes: selectedLead.notes ?? "",
      weightedValue: String(selectedLead.commercial?.weightedValue ?? 0),
      invoiceOutstanding: String(selectedLead.commercial?.invoiceOutstanding ?? 0),
      nextRevenueMilestone: selectedLead.commercial?.nextRevenueMilestone ?? "",
      deliveryStage: selectedLead.delivery?.stage ?? "backlog",
      nextDeliverable: selectedLead.delivery?.nextDeliverable ?? "",
      dueLabel: selectedLead.delivery?.dueLabel ?? "",
      riskLevel: selectedLead.delivery?.riskLevel ?? "low",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?.id]);

  const updateLeadMutation = useMutation({
    mutationFn: () => {
      if (!selectedLead) {
        throw new Error("No selected lead.");
      }

      return leadsApi.update(selectedLead.id, {
        status: leadDraft.status as typeof selectedLead.status,
        priority: leadDraft.priority as typeof selectedLead.priority,
        nextAction: leadDraft.nextAction,
        notes: leadDraft.notes,
        commercial: {
          weightedValue: Number(leadDraft.weightedValue),
          invoiceOutstanding: Number(leadDraft.invoiceOutstanding),
          nextRevenueMilestone: leadDraft.nextRevenueMilestone,
        },
        delivery: {
          stage: leadDraft.deliveryStage as NonNullable<typeof selectedLead.delivery>["stage"],
          nextDeliverable: leadDraft.nextDeliverable,
          dueLabel: leadDraft.dueLabel,
          riskLevel: leadDraft.riskLevel as NonNullable<typeof selectedLead.delivery>["riskLevel"],
        },
      });
    },
    onSuccess: async ({ lead }) => {
      await refetchAfterLeadUpdate(queryClient, lead.id);
      toast.success(`${lead.company} updated.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Lead update failed.");
    },
  });

  const promoteMutation = useMutation({
    mutationFn: () => {
      if (!selectedLead) {
        throw new Error("No selected lead.");
      }

      return leadsApi.promote(selectedLead.id, {
        auditNote: selectedLead.research?.overview ?? selectedLead.notes,
        roadmapItem: selectedLead.delivery?.nextDeliverable ?? selectedLead.nextAction,
      });
    },
    onSuccess: async ({ client }) => {
      await refetchAfterLeadPromotion(queryClient, selectedLead?.id);
      toast.success(`${client.company} promoted to client delivery.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Lead promotion failed.");
    },
  });

  const approvalMutation = useMutation({
    mutationFn: () => {
      if (!selectedLead) {
        throw new Error("No selected lead.");
      }

      return approvalsApi.create({
        action: "change_lead_status",
        targetType: "lead",
        targetId: selectedLead.id,
        title: `Approve ${selectedLead.company} status change`,
        summary: `Move ${selectedLead.company} toward ${leadDraft.status}.`,
        payload: { status: leadDraft.status },
      });
    },
    onSuccess: async () => {
      await refetchAfterApprovalChange(queryClient);
      toast.success("Approval requested.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Approval request failed.");
    },
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_80px_rgba(3,8,14,0.4)] backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Leads CRM
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Tactical pipeline
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
              onClick={() => setImportLeadsOpen(true)}
            >
              Import CSV
              <Upload className="ml-2 h-4 w-4" />
            </Button>
            <Button
              className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
              onClick={() => setCreateLeadOpen(true)}
            >
              Deploy lead
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={leadSearch}
              onChange={(event) => setLeadSearch(event.target.value)}
              className="h-11 rounded-2xl border-white/10 bg-white/5 pl-11 text-slate-100"
              placeholder="Search company, source, or context"
            />
          </div>

          <Tabs
            value={priorityFilter}
            onValueChange={(value) =>
              setPriorityFilter(value as "all" | "critical" | "high" | "normal")
            }
          >
            <TabsList className="h-11 rounded-2xl border border-white/10 bg-white/4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
              <TabsTrigger value="high">High</TabsTrigger>
              <TabsTrigger value="normal">Normal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
          <span>{filteredLeads.length} visible targets</span>
          <span className="font-mono uppercase tracking-[0.26em]">
            source of truth: db
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2 text-cyan-100/70">
              <CircleDollarSign className="h-4 w-4" />
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em]">
                Weighted Pipeline
              </p>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">
              {formatCompactCurrency(weightedPipeline)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2 text-amber-100/70">
              <Receipt className="h-4 w-4" />
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em]">
                Open Invoices
              </p>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">
              {formatCompactCurrency(outstandingInvoices)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2 text-emerald-100/70">
              <ClipboardList className="h-4 w-4" />
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em]">
                Active Delivery
              </p>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">
              {activeDeliveryCount}
            </p>
          </div>
        </div>

        <ScrollArea className="mt-5 h-[calc(100vh-21rem)] min-h-[520px] pr-4">
          <div className="space-y-5">
            {leadsQuery.isError ? (
              <div className="rounded-3xl border border-rose-300/20 bg-rose-300/8 px-4 py-5 text-sm text-rose-100">
                {leadsQuery.error instanceof Error
                  ? leadsQuery.error.message
                  : "Failed to load leads."}
              </div>
            ) : null}
            {groupLeadsByStatus(filteredLeads).map((column) => (
              <div key={column.status}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-slate-500">
                    {column.label}
                  </p>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
                    {column.leads.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {column.leads.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 px-4 py-5 text-sm text-slate-500">
                      No leads in {leadColumnLabels[column.status].toLowerCase()}.
                    </div>
                  ) : (
                    column.leads.map((lead) => {
                      const selected = selectedLead?.id === lead.id;

                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className={cn(
                            "w-full rounded-[1.75rem] border p-4 text-left transition-colors",
                            selected
                              ? "border-cyan-300/20 bg-cyan-300/10"
                              : "border-white/8 bg-white/4 hover:border-white/14 hover:bg-white/6",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-medium text-white">
                                {lead.company}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">
                                {lead.name}
                              </p>
                            </div>
                            <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-200">
                              {describePriority(lead.priority)}
                            </Badge>
                          </div>

                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">
                            {lead.nextAction ??
                              lead.notes ??
                              "Awaiting a sharper next action."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-cyan-300/12 bg-cyan-300/8 px-3 py-1 text-xs text-cyan-100/80">
                              {formatCompactCurrency(lead.commercial?.weightedValue ?? 0)} weighted
                            </span>
                            {(lead.commercial?.invoiceOutstanding ?? 0) > 0 ? (
                              <span className="rounded-full border border-amber-200/12 bg-amber-100/8 px-3 py-1 text-xs text-amber-50">
                                {formatCompactCurrency(lead.commercial?.invoiceOutstanding ?? 0)} unpaid
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-500">
                            <span>{lead.source ?? "Manual capture"}</span>
                            <span>{formatDate(lead.updatedAt)}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_80px_rgba(3,8,14,0.4)] backdrop-blur-xl"
      >
        {selectedLead ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-cyan-100/55">
                    Lead File
                  </p>
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-200">
                    {leadColumnLabels[selectedLead.status]}
                  </Badge>
                </div>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {selectedLead.company}
                </h3>
                <p className="mt-2 text-slate-400">
                  {selectedLead.name}
                  {selectedLead.website ? (
                    <>
                      {" "}
                      •{" "}
                      <a
                        className="text-cyan-100/80 hover:text-cyan-50"
                        href={selectedLead.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedLead.website.replace(/^https?:\/\//, "")}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>

              <Button
                className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
                onClick={() => researchMutation.mutate(selectedLead.id)}
                disabled={researchMutation.isPending}
              >
                {researchMutation.isPending && selectedLead.id === leadId
                  ? "Researching..."
                  : selectedLead.research
                    ? "Re-run research"
                    : "Run research"}
                <Radar className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="rounded-[1.75rem] border-white/8 bg-white/4 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Operator context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
                  <div>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                      Source
                    </p>
                    <p className="mt-2">{selectedLead.source ?? "Manual capture"}</p>
                  </div>
                  <Separator className="bg-white/8" />
                  <div>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2">
                      {selectedLead.notes ??
                        "No notes captured yet. Use research to shape the first targeted angle."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-white/8 bg-white/4 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue + delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                        Weighted
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCompactCurrency(selectedLead.commercial?.weightedValue ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                        Outstanding
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCompactCurrency(selectedLead.commercial?.invoiceOutstanding ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                      Next revenue milestone
                    </p>
                    <p className="mt-2">
                      {selectedLead.commercial?.nextRevenueMilestone ??
                        selectedLead.nextAction ??
                        "Deploy research to generate the next move."}
                    </p>
                  </div>
                  {selectedLead.delivery ? (
                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/8 p-4">
                      <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-emerald-100/60">
                        Delivery track
                      </p>
                      <p className="mt-3 text-slate-100">
                        {selectedLead.delivery.nextDeliverable}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.26em] text-emerald-100/60">
                        {selectedLead.delivery.stage} • {selectedLead.delivery.completionPercent}% • {selectedLead.delivery.dueLabel}
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/8 p-4">
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-emerald-100/60">
                      Tactical recommendation
                    </p>
                    <p className="mt-3 text-slate-100">
                      Keep the action low-risk until a human approves any outbound or commercial change.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4 rounded-[1.75rem] border-white/8 bg-white/4 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Lead controls</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                    onClick={() => approvalMutation.mutate()}
                    disabled={approvalMutation.isPending}
                  >
                    {approvalMutation.isPending ? "Requesting..." : "Approval"}
                    <ShieldCheck className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                    onClick={() => promoteMutation.mutate()}
                    disabled={promoteMutation.isPending}
                  >
                    {promoteMutation.isPending ? "Promoting..." : "Promote"}
                    <BriefcaseBusiness className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    className="rounded-2xl bg-cyan-200 text-slate-950 hover:bg-cyan-100"
                    onClick={() => updateLeadMutation.mutate()}
                    disabled={updateLeadMutation.isPending}
                  >
                    {updateLeadMutation.isPending ? "Saving..." : "Save"}
                    <Save className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-slate-300">Status</span>
                  <select
                    value={leadDraft.status}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({ ...draft, status: event.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-slate-100 outline-none"
                  >
                    {Object.keys(leadColumnLabels).map((status) => (
                      <option key={status} value={status}>
                        {leadColumnLabels[status as keyof typeof leadColumnLabels]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-slate-300">Priority</span>
                  <select
                    value={leadDraft.priority}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({ ...draft, priority: event.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-slate-100 outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-slate-300">Weighted value</span>
                  <Input
                    type="number"
                    value={leadDraft.weightedValue}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({
                        ...draft,
                        weightedValue: event.target.value,
                      }))
                    }
                    className="h-11 rounded-2xl border-white/10 bg-slate-950/70"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-slate-300">Outstanding invoice</span>
                  <Input
                    type="number"
                    value={leadDraft.invoiceOutstanding}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({
                        ...draft,
                        invoiceOutstanding: event.target.value,
                      }))
                    }
                    className="h-11 rounded-2xl border-white/10 bg-slate-950/70"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-slate-300">Delivery stage</span>
                  <select
                    value={leadDraft.deliveryStage}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({
                        ...draft,
                        deliveryStage: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-slate-100 outline-none"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="scoping">Scoping</option>
                    <option value="implementation">Implementation</option>
                    <option value="handoff">Handoff</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-slate-300">Risk</span>
                  <select
                    value={leadDraft.riskLevel}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({ ...draft, riskLevel: event.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-slate-100 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-slate-300">Next action</span>
                  <Textarea
                    value={leadDraft.nextAction}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({ ...draft, nextAction: event.target.value }))
                    }
                    className="min-h-[80px] rounded-2xl border-white/10 bg-slate-950/70"
                  />
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-slate-300">Delivery milestone</span>
                  <Textarea
                    value={leadDraft.nextDeliverable}
                    onChange={(event) =>
                      setLeadDraft((draft) => ({
                        ...draft,
                        nextDeliverable: event.target.value,
                      }))
                    }
                    className="min-h-[80px] rounded-2xl border-white/10 bg-slate-950/70"
                  />
                </label>
              </CardContent>
            </Card>

            <div className="mt-4 flex-1">
              {selectedLead.research ? (
                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <Card className="rounded-[1.75rem] border-white/8 bg-white/4 text-white">
                    <CardHeader>
                      <CardTitle className="text-lg">Research output</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
                      <div>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                          Overview
                        </p>
                        <p className="mt-2">{selectedLead.research.overview}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                          Snapshot
                        </p>
                        <p className="mt-2">{selectedLead.research.companySnapshot}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                          ICP Fit
                        </p>
                        <p className="mt-2">{selectedLead.research.icpFit}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[1.75rem] border-white/8 bg-white/4 text-white">
                    <CardHeader>
                      <CardTitle className="text-lg">Opportunities & signals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
                      <div>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                          Buying signals
                        </p>
                        <ul className="mt-2 space-y-2">
                          {selectedLead.research.buyingSignals.map((signal: string) => (
                            <li key={signal} className="flex gap-2">
                              <ArrowUpRight className="mt-1 h-4 w-4 text-cyan-100/70" />
                              <span>{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                          Opportunity map
                        </p>
                        <div className="mt-3 space-y-3">
                          {selectedLead.research.opportunities.map((opportunity: { title: string; confidence: number; reason: string }) => (
                            <div
                              key={opportunity.title}
                              className="rounded-2xl border border-white/8 bg-white/4 p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-white">
                                  {opportunity.title}
                                </p>
                                <Badge className="rounded-full border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
                                  {opportunity.confidence}%
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm text-slate-300">
                                {opportunity.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/3 p-8 text-center">
                  <div className="max-w-lg">
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                      Research lead
                    </p>
                    <h4 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                      This account is still raw.
                    </h4>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Run the first `research_lead` action to generate a structured profile, opportunity map, activity log, and XP gain.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[640px] items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/3 p-8 text-center">
            <div className="max-w-lg">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                No visible lead
              </p>
              <h4 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Adjust the filters or deploy a fresh lead.
              </h4>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The lead board is empty for the current search and priority filter.
              </p>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}
