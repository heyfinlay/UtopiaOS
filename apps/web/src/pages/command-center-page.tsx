import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookMarked,
  ChartColumnIncreasing,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { formatDate, totalXp } from "@/lib/dashboard";

export function CommandCenterPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
    refetchInterval: 20_000,
  });

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {[0, 1].map((value) => (
          <div
            key={value}
            className="h-[280px] animate-pulse rounded-[2rem] border border-white/8 bg-white/4"
          />
        ))}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(20,35,52,0.95),rgba(4,10,16,0.92))] p-6 shadow-[0_25px_80px_rgba(3,8,14,0.45)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-cyan-100/60">
                Main Quest
              </p>
              <h3 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white">
                {dashboard.mainQuest.title}
              </h3>
            </div>
            <Badge className="rounded-full border border-amber-200/20 bg-amber-100/12 px-4 py-2 text-amber-100">
              +{dashboard.mainQuest.xpReward} XP
            </Badge>
          </div>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            {dashboard.mainQuest.description}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">
                Total XP
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {totalXp(dashboard.stats)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">
                Mission Chain
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {
                  dashboard.missions.filter((mission) => mission.completed).length
                }
                /{dashboard.missions.length}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">
                Live Lead
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {dashboard.featuredLead?.company ?? "Awaiting next target"}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(3,8,14,0.4)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-emerald-100/55">
                Featured Lead
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {dashboard.featuredLead?.company ?? "No lead in queue"}
              </h3>
            </div>
            <Sparkles className="h-5 w-5 text-emerald-200/70" />
          </div>

          {dashboard.featuredLead ? (
            <>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {dashboard.featuredLead.nextAction ??
                  "Deploy a first research pass to surface a specific angle."}
              </p>

              <div className="mt-6 space-y-3">
                {dashboard.pipeline.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">{metric.label}</span>
                      <span className="font-mono text-cyan-100/80">{metric.value}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{metric.trend}</p>
                  </div>
                ))}
              </div>

              <Link
                to={`/leads/${dashboard.featuredLead.id}`}
                className={buttonVariants({
                  className:
                    "mt-6 h-11 w-full rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200",
                })}
              >
                Open lead file
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </>
          ) : null}
        </motion.div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        {dashboard.missions.map((mission, index) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <Card className="h-full rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-200">
                    {mission.statKey}
                  </Badge>
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-amber-100/55">
                    +{mission.xpReward} XP
                  </span>
                </div>
                <CardTitle className="mt-4 text-xl">{mission.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-300">
                  {mission.description}
                </p>
                <Progress
                  className="mt-5 h-2 bg-white/6"
                  value={mission.completed ? 100 : 52}
                />
                <p className="mt-3 text-xs uppercase tracking-[0.26em] text-slate-500">
                  {mission.progressLabel}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                Agent Activity
              </p>
              <CardTitle className="mt-2 text-2xl">Runs & approvals</CardTitle>
            </div>
            <BookMarked className="h-5 w-5 text-cyan-100/65" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[290px] pr-4">
              <div className="space-y-3">
                {dashboard.agentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-3xl border border-white/8 bg-white/4 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {run.summary}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.26em] text-slate-500">
                          {run.mode} • {run.status}
                        </p>
                      </div>
                      <Badge className="rounded-full border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
                        {formatDate(run.startedAt)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                Progression
              </p>
              <CardTitle className="mt-2 text-2xl">Stat growth</CardTitle>
            </div>
            <ChartColumnIncreasing className="h-5 w-5 text-amber-100/65" />
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.stats.map((stat) => (
              <div key={stat.key} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{stat.label}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.26em] text-slate-500">
                      Level {stat.level}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-emerald-100/80">{stat.xp} XP</p>
                </div>
                <Progress className="mt-4 h-2 bg-white/6" value={stat.progress * 100} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                Activity Feed
              </p>
              <CardTitle className="mt-2 text-2xl">Recent momentum</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-2">
              {dashboard.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-100">{activity.message}</p>
                    <span className="font-mono text-xs uppercase tracking-[0.26em] text-slate-500">
                      {activity.actor}
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.26em] text-slate-500">
                    {formatDate(activity.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
