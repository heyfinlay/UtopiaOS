import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Bot, Database, ShieldCheck, TerminalSquare } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dashboard";

export function AgentsPage() {
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
    refetchInterval: 20_000,
  });

  const systemStatusQuery = useQuery({
    queryKey: ["system-status"],
    queryFn: api.getSystemStatus,
    refetchInterval: 20_000,
  });

  const approvalsQuery = useQuery({
    queryKey: ["approvals"],
    queryFn: api.getApprovals,
    refetchInterval: 20_000,
  });

  const resolveApprovalMutation = useMutation({
    mutationFn: ({
      approvalId,
      decision,
    }: {
      approvalId: string;
      decision: "approved" | "rejected";
    }) => api.resolveApproval(approvalId, decision),
    onSuccess: async ({ approval }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success(`${approval.title} ${approval.status}.`);
    },
  });

  const dashboard = dashboardQuery.data;
  const systemStatus = systemStatusQuery.data;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_20px_80px_rgba(3,8,14,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-cyan-100/55">
                Agent Control
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                Runtime visibility for the lead research loop.
              </h3>
            </div>
            <Bot className="h-5 w-5 text-cyan-100/70" />
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            The API persists through Supabase and validates every research payload before it lands.
            When `OPENCLAW_COMMAND` is configured, the runtime pipes the prompt into the external
            command and rejects invalid or failed responses instead of silently falling back.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Agent Mode
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {systemStatus?.agentMode ?? "loading"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Persistence
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {systemStatus?.repositoryMode ?? "loading"}
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
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-emerald-100/55">
                Connection State
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Live configuration</h3>
            </div>
            <TerminalSquare className="h-5 w-5 text-emerald-100/70" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Command
              </p>
              <p className="mt-3 text-sm text-slate-200">
                {systemStatus?.agentCommandPreview ?? "Loading status..."}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Supabase
              </p>
              <p className="mt-3 text-sm text-slate-200">
                {systemStatus?.persistenceEnabled
                  ? "Reads and writes are going to Supabase."
                  : "Supabase is not configured correctly for this runtime."}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Auth State
              </p>
              <p className="mt-3 text-sm text-slate-200">
                {systemStatus?.currentRequestAuthenticated
                  ? "The current request is scoped to the authenticated Supabase user."
                  : "Sign in with a Supabase user to scope reads and writes."}
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Approval Queue
            </p>
            <CardTitle className="mt-2 text-2xl">Human decisions before risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(approvalsQuery.data?.approvals ?? dashboard?.approvals ?? []).map((approval) => (
              <div
                key={approval.id}
                className="rounded-[1.75rem] border border-white/8 bg-white/4 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{approval.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {approval.summary}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                      {approval.action} • {approval.status}
                    </p>
                  </div>
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                    {formatDate(approval.createdAt)}
                  </Badge>
                </div>
                {approval.status === "pending" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
                      onClick={() =>
                        resolveApprovalMutation.mutate({
                          approvalId: approval.id,
                          decision: "approved",
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                      onClick={() =>
                        resolveApprovalMutation.mutate({
                          approvalId: approval.id,
                          decision: "rejected",
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {(approvalsQuery.data?.approvals ?? dashboard?.approvals ?? []).length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/3 p-5 text-sm text-slate-400">
                No approvals are waiting.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Safety Model
            </p>
            <CardTitle className="mt-2 text-2xl">Rules enforced in the loop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Agent outputs are treated as untrusted until they pass schema validation.",
              "Research and drafting are low-risk; outbound, pricing, deletion, and state transitions need approval.",
              "Every run and resulting state change is logged in the activity and agent run streams.",
            ].map((rule, index) => (
              <div key={rule} className="rounded-[1.75rem] border border-white/8 bg-white/4 p-4">
                <div className="flex items-start gap-3">
                  {index === 0 ? (
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-100/70" />
                  ) : index === 1 ? (
                    <Activity className="mt-1 h-4 w-4 shrink-0 text-cyan-100/70" />
                  ) : (
                    <Database className="mt-1 h-4 w-4 shrink-0 text-amber-100/70" />
                  )}
                  <p className="text-sm leading-7 text-slate-200">{rule}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Recent Runs
            </p>
            <CardTitle className="mt-2 text-2xl">Observed agent history</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-3">
                {(dashboard?.agentRuns ?? []).map((run) => (
                  <div key={run.id} className="rounded-[1.75rem] border border-white/8 bg-white/4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{run.summary}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.26em] text-slate-500">
                          {run.mode} • {run.status}
                        </p>
                      </div>
                      <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                        {formatDate(run.startedAt)}
                      </Badge>
                    </div>
                    <p className="mt-4 rounded-2xl border border-white/8 bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-300">
                      {run.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
