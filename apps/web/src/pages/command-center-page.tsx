import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Radar,
  Receipt,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dashboardApi } from "@/domains/dashboard/api";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  totalXp,
} from "@/lib/dashboard";
import { queryKeys } from "@/lib/query/keys";

const actionToneClasses = {
  revenue: "border-emerald-300/15 bg-emerald-300/10 text-emerald-50",
  pipeline: "border-cyan-300/15 bg-cyan-300/10 text-cyan-50",
  delivery: "border-amber-200/15 bg-amber-100/10 text-amber-50",
  ops: "border-white/10 bg-white/5 text-slate-100",
} as const;

export function CommandCenterPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: dashboardApi.get,
    refetchInterval: 20_000,
  });

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
        {[0, 1, 2, 3, 4].map((value) => (
          <div
            key={value}
            className="h-[240px] animate-pulse rounded-[2rem] border border-white/8 bg-white/4"
          />
        ))}
      </section>
    );
  }

  const revenueProgress = Math.round(dashboard.revenue.progress * 100);
  const topLeads = [dashboard.featuredLead, ...dashboard.delivery.highlightedAccounts]
    .filter((lead, index, array): lead is NonNullable<typeof lead> =>
      Boolean(lead) && array.findIndex((candidate) => candidate?.id === lead?.id) === index,
    )
    .slice(0, 4);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr_0.95fr]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(16,37,46,0.95),rgba(6,12,20,0.95))] p-6 shadow-[0_25px_80px_rgba(3,8,14,0.45)] xl:col-span-2"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-cyan-100/60">
              Cash Target
            </p>
            <h3 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {formatCurrency(dashboard.revenue.collected)} collected this cycle.
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-300">
              {dashboard.revenue.headline}
            </p>
          </div>

          <div className="min-w-[220px] rounded-[1.8rem] border border-white/10 bg-white/6 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-slate-500">
                  Progress To Target
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {revenueProgress}%
                </p>
              </div>
              <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-100">
                {formatCurrency(dashboard.revenue.target)}
              </Badge>
            </div>
            <Progress className="mt-5 h-2.5 bg-white/8" value={revenueProgress} />
            <div className="mt-5 flex items-center justify-between text-sm text-slate-300">
              <span>Pipeline backing it</span>
              <span className="font-mono text-cyan-100/80">
                {formatCompactCurrency(dashboard.revenue.weightedPipeline)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.revenue.financeMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.7rem] border border-white/10 bg-white/5 p-4"
            >
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {formatCompactCurrency(metric.amount)}
              </p>
              <p className="mt-2 text-sm text-slate-400">{metric.changeLabel}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(3,8,14,0.4)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-emerald-100/55">
              Main Quest
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {dashboard.mainQuest.title}
            </h3>
          </div>
          <Target className="h-5 w-5 text-emerald-100/70" />
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          {dashboard.mainQuest.description}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
              Total XP
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {totalXp(dashboard.stats)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
              Missions Closed
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {dashboard.missions.filter((mission) => mission.completed).length}/
              {dashboard.missions.length}
            </p>
          </div>
        </div>
      </motion.section>

      <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Action Queue
            </p>
            <CardTitle className="mt-2 text-2xl">What moves money next</CardTitle>
          </div>
          <ClipboardList className="h-5 w-5 text-cyan-100/65" />
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.actionItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className={`block rounded-[1.6rem] border p-4 transition-colors ${actionToneClasses[item.emphasis]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-medium">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-inherit/80">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0" />
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.24em] text-inherit/70">
                {item.valueLabel}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Lead Radar
            </p>
            <CardTitle className="mt-2 text-2xl">Quick access targets</CardTitle>
          </div>
          <Radar className="h-5 w-5 text-emerald-100/65" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {topLeads.map((lead) => (
            <Link
              key={lead.id}
              to={`/leads/${lead.id}`}
              className="rounded-[1.6rem] border border-white/8 bg-white/4 p-4 transition-colors hover:border-white/14 hover:bg-white/6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium text-white">{lead.company}</p>
                  <p className="mt-1 text-sm text-slate-400">{lead.name}</p>
                </div>
                <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                  {lead.status}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-emerald-100/80">
                {formatCompactCurrency(lead.commercial?.weightedValue ?? lead.commercial?.closedValue ?? 0)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                {lead.commercial?.nextRevenueMilestone ?? lead.nextAction ?? "Review the lead."}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Delivery Pressure
            </p>
            <CardTitle className="mt-2 text-2xl">What must land to protect revenue</CardTitle>
          </div>
          <Receipt className="h-5 w-5 text-amber-100/65" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
                Active
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {dashboard.delivery.activeCount}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
                Due Soon
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {dashboard.delivery.dueSoonCount}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
                At Risk
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {dashboard.delivery.atRiskCount}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-amber-200/12 bg-amber-100/8 p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-amber-100/65">
              Next payout
            </p>
            <p className="mt-3 text-sm leading-6 text-amber-50">
              {dashboard.delivery.nextPayoutLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Pipeline + Momentum
            </p>
            <CardTitle className="mt-2 text-2xl">Bento analytics</CardTitle>
          </div>
          <TrendingUp className="h-5 w-5 text-cyan-100/65" />
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr_1fr]">
          <div className="space-y-3">
            {dashboard.pipeline.map((metric) => (
              <div key={metric.label} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{metric.label}</p>
                  <p className="font-mono text-sm text-cyan-100/80">{metric.value}</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">{metric.trend}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">
                  Recent Activity
                </p>
                <h4 className="mt-3 text-xl font-semibold text-white">
                  Feed without the noise
                </h4>
              </div>
              <Sparkles className="h-5 w-5 text-emerald-100/70" />
            </div>
            <ScrollArea className="mt-4 h-[240px] pr-4">
              <div className="space-y-3">
                {dashboard.recentActivity.map((activity) => (
                  <div key={activity.id} className="rounded-[1.35rem] border border-white/8 bg-slate-950/70 p-4">
                    <p className="text-sm leading-6 text-slate-100">{activity.message}</p>
                    <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
                      <span>{activity.actor}</span>
                      <span>{formatDate(activity.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-3">
            {dashboard.stats.map((stat) => (
              <div key={stat.key} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{stat.label}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.24em] text-slate-500">
                      Level {stat.level}
                    </p>
                  </div>
                  <CircleDollarSign className="h-4 w-4 text-amber-100/70" />
                </div>
                <Progress className="mt-4 h-2 bg-white/6" value={stat.progress * 100} />
                <p className="mt-3 text-sm text-slate-300">{stat.xp} XP banked</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
