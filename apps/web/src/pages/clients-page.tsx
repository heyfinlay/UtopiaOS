import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, BriefcaseBusiness, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clientsApi } from "@/domains/clients/api";
import { leadsApi } from "@/domains/leads/api";
import { formatDate } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query/keys";
import { refetchAfterClientUpdate } from "@/lib/query/refetchers";

export function ClientsPage() {
  const queryClient = useQueryClient();
  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: leadsApi.list,
    refetchInterval: 20_000,
  });
  const clientsQuery = useQuery({
    queryKey: queryKeys.clients.all(),
    queryFn: clientsApi.list,
    refetchInterval: 20_000,
  });
  const updateClientMutation = useMutation({
    mutationFn: (clientId: string) =>
      clientsApi.update(clientId, {
        roadmapItem: "Review the next delivery checkpoint and update client status.",
      }),
    onSuccess: async ({ client }) => {
      await refetchAfterClientUpdate(queryClient);
      toast.success(`${client.company} roadmap updated.`);
    },
  });

  const leads = leadsQuery.data?.leads ?? [];
  type LeadItem = (typeof leads)[number];
  const clientReadyLeads = leads.filter(
    (lead) => lead.research || ["qualified", "proposal", "won"].includes(lead.status),
  );
  const deliveryCandidates = clientReadyLeads.filter((lead) =>
    ["researching", "qualified", "proposal"].includes(lead.status),
  );
  const clients = clientsQuery.data?.clients ?? [];
  type ClientItem = (typeof clients)[number];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_20px_80px_rgba(3,8,14,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-cyan-100/55">
                Client Readiness
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                Delivery starts once research becomes a shaped offer.
              </h3>
            </div>
            <BriefcaseBusiness className="h-5 w-5 text-emerald-100/70" />
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            This board surfaces researched accounts that are close to becoming active client work.
            It keeps the handoff from sales to delivery visible before proposal or onboarding steps
            are approved.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Ready Accounts
              </p>
              <p className="mt-3 text-3xl font-semibold">{clientReadyLeads.length}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Delivery Queue
              </p>
              <p className="mt-3 text-3xl font-semibold">{clients.length}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Won
              </p>
              <p className="mt-3 text-3xl font-semibold">
                {leads.filter((lead: LeadItem) => lead.status === "won").length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_20px_80px_rgba(3,8,14,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-amber-100/55">
                Handoff Rules
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Guardrails</h3>
            </div>
            <ShieldAlert className="h-5 w-5 text-amber-100/70" />
          </div>

          <div className="mt-6 space-y-3">
            {[
              "Agent research can shape the offer, but humans approve any commercial move.",
              "Proposal, pricing, and outcome-state changes stay behind explicit approval.",
              "The next client module can attach audit notes and roadmaps to these records.",
            ].map((rule) => (
              <div key={rule} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm leading-6 text-slate-200">{rule}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Delivery Candidates
            </p>
            <CardTitle className="mt-2 text-2xl">Accounts ready for scoped work</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-4">
              <div className="space-y-4">
                {clients.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-5 text-sm text-slate-400">
                    Promote a lead to create the first client record.
                  </div>
                ) : (
                  clients.map((client: ClientItem) => (
                    <div
                      key={client.id}
                      className="rounded-[1.75rem] border border-white/8 bg-white/4 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">{client.company}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {client.auditNotes.length} audit note{client.auditNotes.length === 1 ? "" : "s"} • {client.deliveryRoadmap.length} roadmap item{client.deliveryRoadmap.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                          {client.status}
                        </Badge>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-300">
                        {client.deliveryRoadmap[client.deliveryRoadmap.length - 1] ??
                          "Confirm the next client delivery step."}
                      </p>

                      {client.auditNotes.length ? (
                        <div className="mt-4 rounded-2xl border border-cyan-200/15 bg-cyan-100/8 p-4">
                          <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-amber-100/60">
                            Audit Notes
                          </p>
                          <div className="mt-3 space-y-2">
                            {client.auditNotes.slice(-2).map((note: string) => (
                              <p key={note} className="text-sm leading-6 text-cyan-50">
                                {note}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.26em] text-slate-500">
                        <span>{formatDate(client.updatedAt)}</span>
                        <Button
                          variant="outline"
                          className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                          onClick={() => updateClientMutation.mutate(client.id)}
                        >
                          Add checkpoint
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Offer Angles
            </p>
            <CardTitle className="mt-2 text-2xl">What the agent already surfaced</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveryCandidates.slice(0, 4).map((lead) => (
              <div key={lead.id} className="rounded-[1.75rem] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{lead.company}</p>
                  <Sparkles className="h-4 w-4 text-cyan-100/70" />
                </div>
                <div className="mt-3 space-y-2">
                  {(lead.research?.opportunities ?? []).slice(0, 2).map((opportunity: { title: string; reason: string }) => (
                    <div key={opportunity.title} className="flex gap-3 text-sm leading-6 text-slate-300">
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-cyan-100/70" />
                      <span>
                        {opportunity.title}: {opportunity.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
