import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardCheck, Orbit, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dashboardApi } from "@/domains/dashboard/api";
import { formatDate, totalXp } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query/keys";

export function MissionsPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: dashboardApi.get,
    refetchInterval: 20_000,
  });

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((value) => (
          <div
            key={value}
            className="h-[280px] animate-pulse rounded-[2rem] border border-white/8 bg-white/4"
          />
        ))}
      </section>
    );
  }

  type Mission = (typeof dashboard.missions)[number];
  type ProgressStat = (typeof dashboard.stats)[number];
  type ActivityItem = (typeof dashboard.recentActivity)[number];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_20px_80px_rgba(3,8,14,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-cyan-100/55">
                Mission Board
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                Progression is attached to real operator work.
              </h3>
            </div>
            <ClipboardCheck className="h-5 w-5 text-cyan-100/70" />
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            The command center already calculates mission completion from activity and agent run
            logs. This screen turns that reward loop into a dedicated operational view.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Completed
              </p>
              <p className="mt-3 text-3xl font-semibold">
                {dashboard.missions.filter((mission: Mission) => mission.completed).length}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Total XP
              </p>
              <p className="mt-3 text-3xl font-semibold">{totalXp(dashboard.stats)}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Live Quest
              </p>
              <p className="mt-3 text-xl font-semibold">{dashboard.mainQuest.xpReward} XP</p>
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
                Main Quest
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                {dashboard.mainQuest.title}
              </h3>
            </div>
            <Orbit className="h-5 w-5 text-emerald-100/70" />
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {dashboard.mainQuest.description}
          </p>
          <div className="mt-6 rounded-3xl border border-emerald-300/15 bg-emerald-300/8 p-4">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-emerald-100/60">
              Reward
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              +{dashboard.mainQuest.xpReward} XP
            </p>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Active Missions
            </p>
            <CardTitle className="mt-2 text-2xl">Operational objectives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.missions.map((mission: Mission, index: number) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="rounded-[1.75rem] border border-white/8 bg-white/4 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{mission.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {mission.description}
                    </p>
                  </div>
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                    {mission.statKey}
                  </Badge>
                </div>
                <Progress
                  className="mt-5 h-2 bg-white/6"
                  value={mission.completed ? 100 : 55}
                />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-500">
                  <span>{mission.progressLabel}</span>
                  <span>+{mission.xpReward} XP</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
            <CardHeader>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                Stat Growth
              </p>
              <CardTitle className="mt-2 text-2xl">Current build</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.stats.map((stat: ProgressStat) => (
                <div key={stat.key} className="rounded-[1.75rem] border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{stat.label}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.26em] text-slate-500">
                        Level {stat.level}
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-cyan-100/70" />
                  </div>
                  <Progress className="mt-4 h-2 bg-white/6" value={stat.progress * 100} />
                  <p className="mt-3 text-sm text-slate-300">
                    {stat.xp} XP collected, next breakpoint at {stat.nextLevelAt}.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
            <CardHeader>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                Activity
              </p>
              <CardTitle className="mt-2 text-2xl">Recent momentum</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {dashboard.recentActivity.map((activity: ActivityItem) => (
                    <div key={activity.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                      <p className="text-sm leading-6 text-slate-200">{activity.message}</p>
                      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-500">
                        <span>{activity.actor}</span>
                        <span>{formatDate(activity.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
