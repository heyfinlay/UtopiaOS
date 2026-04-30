import { motion } from "framer-motion";
import {
  Bot,
  BriefcaseBusiness,
  ClipboardCheck,
  LayoutDashboard,
  LibraryBig,
  Plus,
  Radar,
  ShieldCheck,
} from "lucide-react";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { CreateLeadDialog } from "@/components/create-lead-dialog";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const navigation = [
  { to: "/", label: "Command", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Radar },
  { to: "/clients", label: "Clients", icon: BriefcaseBusiness },
  { to: "/missions", label: "Missions", icon: ClipboardCheck },
  { to: "/vault", label: "Vault", icon: LibraryBig },
  { to: "/agents", label: "Agents", icon: Bot },
] as const;

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const createLeadOpen = useUiStore((state) => state.createLeadOpen);
  const setCreateLeadOpen = useUiStore((state) => state.setCreateLeadOpen);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(31,170,153,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(225,176,70,0.18),transparent_28%),linear-gradient(180deg,#07111a_0%,#04070c_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex w-full flex-col rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_20px_80px_rgba(3,8,14,0.65)] backdrop-blur-xl lg:w-[290px]"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-emerald-200/70">
                Temporary Utopia
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Utopia Command
              </h1>
            </div>
          </div>

          <div className="mb-5 rounded-3xl border border-cyan-300/10 bg-cyan-300/6 p-4">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-cyan-100/60">
              Operator State
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Human approval is enforced for any risky outbound, destructive, or pricing-related action.
            </p>
          </div>

          <nav className="space-y-2">
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
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                    active
                      ? "border-cyan-300/20 bg-cyan-300/12 text-white"
                      : "border-transparent bg-white/3 text-slate-400 hover:border-white/10 hover:bg-white/6 hover:text-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 pt-8">
            <Button
              className="h-12 w-full rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
              onClick={() => setCreateLeadOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Lead
            </Button>

            <div className="rounded-3xl border border-amber-200/10 bg-amber-100/5 p-4">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-amber-100/55">
                Safety Rail
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                OpenClaw can research, draft, and enrich. Any high-risk action remains pending until you approve it.
              </p>
            </div>
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <motion.header
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-950/70 px-5 py-4 shadow-[0_20px_80px_rgba(3,8,14,0.5)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.35em] text-slate-400">
                Tactical Business RPG
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {location.pathname === "/"
                  ? "Command Center"
                  : navigation.find((item) =>
                      item.to === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.to),
                    )?.label ?? "Module"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/6 px-4 py-2">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-cyan-100/55">
                  Agent Pulse
                </p>
                <p className="mt-1 text-sm text-slate-200">Research loop ready</p>
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                onClick={() => navigate("/leads")}
              >
                Open lead board
              </Button>
            </div>
          </motion.header>

          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>

      <CreateLeadDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
      />
    </div>
  );
}

