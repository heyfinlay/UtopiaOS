import { spawn } from "node:child_process";
import process from "node:process";

import {
  type Lead,
  researchLeadResultSchema,
  type ResearchLeadResult,
} from "@utopia/schemas";

export type ResearchLeadExecution = {
  result: ResearchLeadResult;
  mode: "mock" | "mock-fallback" | "openclaw-cli";
  prompt: string;
  error?: string;
};

export type AgentConnectionStatus = {
  configured: boolean;
  commandPreview: string;
  mode: "mock" | "openclaw-cli";
};

const safeDomain = (website?: string) => {
  if (!website) {
    return "unknown domain";
  }

  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "");
  }
};

const compact = (parts: Array<string | undefined>) =>
  parts.filter(Boolean).join(" ");

const getCommandPreview = (command?: string) => {
  if (!command) {
    return "OPENCLAW_COMMAND not configured";
  }

  const [binary] = command.trim().split(/\s+/);

  return binary ? `${binary} …` : "OPENCLAW_COMMAND configured";
};

const buildPrompt = (lead: Lead) => `You are researching a business lead for Temporary Utopia.
Return strict JSON with these keys:
overview, companySnapshot, icpFit, buyingSignals, opportunities, recommendedOffer, nextAction, riskFlags, confidence, sources.

Lead:
- Name: ${lead.name}
- Company: ${lead.company}
- Website: ${lead.website ?? "Unknown"}
- Source: ${lead.source ?? "Unknown"}
- Priority: ${lead.priority}
- Notes: ${lead.notes ?? "None"}

Rules:
- Focus on AI implementation and workflow automation opportunities.
- Keep it practical for a founder-led service business.
- Do not invent external actions beyond low-risk research and drafting.
- ` +
    "Return JSON only.";

const buildMockResearch = (lead: Lead): ResearchLeadResult => {
  const domain = safeDomain(lead.website);
  const priorityLabel =
    lead.priority === "critical"
      ? "high-urgency"
      : lead.priority === "high"
        ? "warm"
        : "early-stage";
  const sourceLabel = lead.source ?? "manual intake";
  const notesLabel = lead.notes
    ? `The captured note points to ${lead.notes.toLowerCase()}.`
    : "The intake is still light, so the first call should confirm the real bottleneck before scoping work.";
  const offer =
    lead.priority === "critical"
      ? "AI Efficiency Audit with a 14-day automation roadmap"
      : "AI Workflow Audit focused on sales-to-delivery handoff";
  const firstOpportunity =
    lead.notes?.toLowerCase().includes("report")
      ? "Reporting automation sprint"
      : lead.notes?.toLowerCase().includes("onboarding")
        ? "Onboarding system redesign"
        : "Lead qualification and follow-up automation";
  const prioritySignal =
    lead.priority === "critical"
      ? "Critical priority suggests the account matters immediately."
      : lead.priority === "high"
        ? "High priority suggests the account deserves an early follow-up."
        : "Normal priority still makes the account worth exploring without forcing urgency too early.";

  return researchLeadResultSchema.parse({
    overview: `${lead.company} appears to be an ${priorityLabel} prospect for Temporary Utopia because the intake already hints at repeatable operational drag that fits an AI systems engagement.`,
    companySnapshot: `${lead.company} came in via ${sourceLabel} and is operating from ${domain}, which suggests there is enough context to frame a highly specific first outreach angle.`,
    icpFit: `${lead.company} fits the founder-led service-business profile where fast workflow wins can demonstrate value before a larger implementation.`,
    buyingSignals: [
      prioritySignal,
      notesLabel,
      `A focused offer can be positioned around time recovery, consistency, and founder leverage rather than generic AI experimentation.`,
    ],
    opportunities: [
      {
        title: firstOpportunity,
        reason:
          "The current context points to repetitive coordination work that can be mapped into an automation wedge quickly.",
        confidence: lead.priority === "critical" ? 89 : 76,
      },
      {
        title: "AI Efficiency Audit",
        reason:
          "A short audit creates a low-friction entry point while surfacing the process debt most likely to unlock near-term revenue.",
        confidence: 84,
      },
    ],
    recommendedOffer: offer,
    nextAction: `Draft a short, specific follow-up for ${lead.name} that references the likely bottleneck and offers a rapid audit conversation.`,
    riskFlags: lead.website
      ? ["Current assessment relies on intake data and should be validated with a direct discovery call."]
      : [
          "No website was supplied, so industry positioning and maturity are still inferred.",
          "The first outreach should confirm team size, service model, and urgency before scoping work.",
        ],
    confidence: lead.priority === "critical" ? 86 : 74,
    sources: [lead.website ?? "Lead intake record", sourceLabel, "Temporary Utopia operator notes"],
  });
};

const runOpenClawCommand = async (
  command: string,
  prompt: string,
): Promise<ResearchLeadResult> =>
  new Promise((resolve, reject) => {
    const child = spawn("sh", ["-lc", command], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(compact([`OpenClaw command exited with code ${code}.`, stderr.trim()])));
        return;
      }

      try {
        resolve(researchLeadResultSchema.parse(JSON.parse(stdout)));
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });

export const runResearchLeadAction = async (
  lead: Lead,
): Promise<ResearchLeadExecution> => {
  const prompt = buildPrompt(lead);
  const command = process.env.OPENCLAW_COMMAND;

  if (!command) {
    return {
      result: buildMockResearch(lead),
      mode: "mock",
      prompt,
    };
  }

  try {
    const result = await runOpenClawCommand(command, prompt);

    return {
      result,
      mode: "openclaw-cli",
      prompt,
    };
  } catch (error) {
    return {
      result: buildMockResearch(lead),
      mode: "mock-fallback",
      prompt,
      error: error instanceof Error ? error.message : "Unknown OpenClaw error",
    };
  }
};

export const getAgentConnectionStatus = (
  command = process.env.OPENCLAW_COMMAND,
): AgentConnectionStatus => ({
  configured: Boolean(command?.trim()),
  commandPreview: getCommandPreview(command),
  mode: command?.trim() ? "openclaw-cli" : "mock",
});
