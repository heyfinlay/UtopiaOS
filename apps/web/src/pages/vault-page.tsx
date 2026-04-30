import { motion } from "framer-motion";
import { BookText, Bot, FileStack, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const vaultEntries = [
  {
    title: "Research Prompt Contract",
    category: "Agent",
    icon: Bot,
    description:
      "The `research_lead` action expects strict JSON with overview, snapshot, fit, signals, opportunities, offer, next action, risk flags, confidence, and sources.",
    body: `You are researching a business lead for Temporary Utopia.\nReturn strict JSON only.\nFocus on AI implementation and workflow automation opportunities.`,
  },
  {
    title: "Approval Rail",
    category: "Safety",
    icon: ShieldCheck,
    description:
      "Outbound messaging, pricing changes, deletions, and outcome-state transitions stay behind explicit human approval.",
    body: `Allowed: research, drafting, low-risk enrichment.\nApproval required: outbound, pricing, destructive changes, won/lost state transitions.`,
  },
  {
    title: "Offer Framing Template",
    category: "Delivery",
    icon: FileStack,
    description:
      "A compact structure for turning research output into a concrete audit offer and clear next step.",
    body: `1. State the operational bottleneck.\n2. Tie it to time recovery or founder leverage.\n3. Propose a short audit or automation roadmap.\n4. Ask for the lowest-friction next conversation.`,
  },
  {
    title: "Operator Review Checklist",
    category: "Workflow",
    icon: BookText,
    description:
      "Use this after each research run to decide whether the result is usable, needs correction, or should remain parked.",
    body: `Check the sources, confirm the bottleneck, assess the offer angle, review risk flags, and decide whether a human follow-up is justified.`,
  },
];

export function VaultPage() {
  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_20px_80px_rgba(3,8,14,0.45)] backdrop-blur-xl"
      >
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-cyan-100/55">
          Vault
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight">
          Reusable operating artifacts for the human-plus-agent loop.
        </h3>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          The vault is the stable layer: prompts, guardrails, and framing structures that keep the
          workflow consistent as more actions are added to the system.
        </p>
      </motion.section>

      <section className="grid gap-4 xl:grid-cols-2">
        {vaultEntries.map((entry, index) => {
          const Icon = entry.icon;

          return (
            <motion.div
              key={entry.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card className="h-full rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                      {entry.category}
                    </Badge>
                    <Icon className="h-5 w-5 text-cyan-100/70" />
                  </div>
                  <CardTitle className="mt-3 text-2xl">{entry.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-slate-300">{entry.description}</p>
                  <pre className="mt-5 overflow-x-auto rounded-[1.5rem] border border-white/8 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-200">
                    {entry.body}
                  </pre>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
