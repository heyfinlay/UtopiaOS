import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bot,
  BriefcaseBusiness,
  ClipboardCheck,
  DollarSign,
  LayoutDashboard,
  LibraryBig,
  Plus,
  Radar,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { CreateLeadDialog } from "@/components/create-lead-dialog";
import { ImportLeadsDialog } from "@/components/import-leads-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCompactCurrency } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const navigation = [
  { to: "/", label: "Command", shortLabel: "Cmd", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", shortLabel: "Leads", icon: Radar },
  { to: "/clients", label: "Clients", shortLabel: "Clients", icon: BriefcaseBusiness },
  { to: "/missions", label: "Missions", shortLabel: "XP", icon: ClipboardCheck },
  { to: "/vault", label: "Vault", shortLabel: "Vault", icon: LibraryBig },
  { to: "/agents", label: "Agents", shortLabel: "Agent", icon: Bot },
] as const;

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const createLeadOpen = useUiStore((state) => state.createLeadOpen);
  const importLeadsOpen = useUiStore((state) => state.importLeadsOpen);
  const setCreateLeadOpen = useUiStore((state) => state.setCreateLeadOpen);
  const setImportLeadsOpen = useUiStore((state) => state.setImportLeadsOpen);

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

  const dashboard = dashboardQuery.data;
  const systemStatus = systemStatusQuery.data;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(41,188,160,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(240,174,64,0.14),transparent_22%),linear-gradient(180deg,#050814_0%,#08101a_42%,#04070c_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-4 px-3 py-3 md:grid md:grid-cols-[104px_minmax(0,1fr)] md:px-5 md:py-5 xl:grid-cols-[244px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col rounded-[2rem] border border-white/10 bg-slate-950/75 p-3 shadow-[0_20px_80px_rgba(3,8,14,0.65)] backdrop-blur-xl md:sticky md:top-5 md:h-[calc(100vh-2.5rem)] xl:p-4"
        >
          <div className="flex items-center gap-3 rounded-[1.6rem] border border-emerald-300/10 bg-emerald-300/6 px-3 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 md:hidden xl:block">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-emerald-100/60">
                Temporary Utopia
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">
                Utopia Command
              </h1>
            </div>
          </div>

          <Button
            className="mt-4 h-12 rounded-[1.35rem] bg-emerald-300 text-slate-950 hover:bg-emerald-200 md:px-0 xl:px-4"
            onClick={() => setCreateLeadOpen(true)}
          >
            <Plus className="h-4 w-4 md:mr-0 xl:mr-2" />
            <span className="md:hidden xl:inline">Create Lead</span>
          </Button>

          <nav className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/"
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[1.4rem] border px-2 py-3 text-center text-xs transition-colors xl:min-h-[54px] xl:flex-row xl:justify-start xl:px-4 xl:text-sm",
                    active
                      ? "border-cyan-300/20 bg-cyan-300/12 text-white"
                      : "border-transparent bg-white/3 text-slate-400 hover:border-white/10 hover:bg-white/6 hover:text-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium xl:hidden">{item.shortLabel}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto hidden space-y-3 md:block">
            <div className="rounded-[1.6rem] border border-white/8 bg-white/4 p-3">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-slate-500">
                Cash In
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {dashboard ? formatCompactCurrency(dashboard.revenue.collected) : "…"}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/8 bg-white/4 p-3">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-slate-500">
                Open Invoices
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {dashboard ? formatCompactCurrency(dashboard.revenue.outstanding) : "…"}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-amber-200/12 bg-amber-100/6 p-3">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-amber-100/55">
                Approval Rail
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Revenue moves fast. Risky actions still wait for human approval.
              </p>
            </div>
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <motion.header
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-white/10 bg-slate-950/70 px-4 py-4 shadow-[0_20px_80px_rgba(3,8,14,0.5)] backdrop-blur-xl"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.35em] text-slate-400">
                  Revenue Operator System
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {location.pathname === "/"
                    ? "Command Center"
                    : navigation.find((item) =>
                        item.to === "/"
                          ? location.pathname === "/"
                          : location.pathname.startsWith(item.to),
                      )?.label ?? "Module"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Keep the day focused on collected cash, next revenue milestones, and delivery that unlocks the next sale.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[1.35rem] border border-emerald-300/12 bg-emerald-300/8 px-4 py-3">
                  <div className="flex items-center gap-2 text-emerald-100/75">
                    <DollarSign className="h-4 w-4" />
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em]">
                      Collected
                    </p>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {dashboard ? formatCompactCurrency(dashboard.revenue.collected) : "…"}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-amber-200/12 bg-amber-100/7 px-4 py-3">
                  <div className="flex items-center gap-2 text-amber-100/70">
                    <Receipt className="h-4 w-4" />
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em]">
                      Outstanding
                    </p>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {dashboard ? formatCompactCurrency(dashboard.revenue.outstanding) : "…"}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-cyan-300/12 bg-cyan-300/8 px-4 py-3">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-cyan-100/60">
                    Agent Mode
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {systemStatus?.agentMode ?? "loading"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-12 rounded-[1.35rem] border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                  onClick={() => navigate("/leads")}
                >
                  Open lead board
                </Button>
              </div>
            </div>
          </motion.header>

          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>

      <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} />
      <ImportLeadsDialog open={importLeadsOpen} onOpenChange={setImportLeadsOpen} />
    </div>
  );
}
