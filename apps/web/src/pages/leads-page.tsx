import { startTransition, useDeferredValue, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Radar, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import {
  describePriority,
  formatDate,
  groupLeadsByStatus,
  leadColumnLabels,
} from "@/lib/dashboard";
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
  const deferredSearch = useDeferredValue(leadSearch);

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: api.getLeads,
  });

  const researchMutation = useMutation({
    mutationFn: api.researchLead,
    onSuccess: async ({ lead }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
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

  useEffect(() => {
    if (!leadId && filteredLeads[0]) {
      startTransition(() => navigate(`/leads/${filteredLeads[0].id}`, { replace: true }));
    }
  }, [filteredLeads, leadId, navigate]);

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
          <Button
            className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
            onClick={() => setCreateLeadOpen(true)}
          >
            Deploy lead
          </Button>
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

        <ScrollArea className="mt-5 h-[calc(100vh-21rem)] min-h-[520px] pr-4">
          <div className="space-y-5">
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
                  <CardTitle className="text-lg">Next action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
                  <p>
                    {selectedLead.nextAction ??
                      "Deploy research to generate the next move."}
                  </p>
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
                          {selectedLead.research.buyingSignals.map((signal) => (
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
                          {selectedLead.research.opportunities.map((opportunity) => (
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
