import {
  openClawResearchJobResultSchema,
  type Lead,
  type OpenClawResearchJobResult,
  researchLeadResultSchema,
  type ResearchLeadResult,
} from "@utopia/schemas";

type EnvShape = Record<string, string | undefined>;

const runtimeEnv: EnvShape =
  typeof process !== "undefined" && process.env
    ? (process.env as EnvShape)
    : {};

export type ResearchLeadExecution = {
  result: ResearchLeadResult;
  mode: "mock" | "openclaw-cli" | "gateway";
  prompt: string;
};

export type AgentConnectionStatus = {
  configured: boolean;
  commandPreview: string;
  mode: "mock" | "openclaw-cli" | "gateway";
  lastRunStatus?: "idle" | "running" | "completed" | "failed";
  lastRunError?: string;
  timeoutMs?: number;
  expectedOutputFormat: "research_lead_json";
  schemaValidationStatus?: "unknown" | "passed" | "failed";
  securityNote?: string;
};

const DEFAULT_TIMEOUT_MS = 45_000;

const runtimeDiagnosticsState: Omit<AgentConnectionStatus, "configured" | "commandPreview" | "mode"> = {
  lastRunStatus: "idle",
  lastRunError: undefined,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  expectedOutputFormat: "research_lead_json",
  schemaValidationStatus: "unknown",
  securityNote:
    "OpenClaw command execution is local-first. Treat stdout as untrusted until JSON parse and schema validation succeed.",
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

const getTimeoutMs = () => {
  const raw = runtimeEnv.OPENCLAW_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

const updateRuntimeDiagnostics = (
  updates: Partial<Omit<AgentConnectionStatus, "configured" | "commandPreview" | "mode">>,
) => {
  Object.assign(runtimeDiagnosticsState, updates);
};

export const resetAgentRuntimeDiagnostics = () => {
  runtimeDiagnosticsState.lastRunStatus = "idle";
  runtimeDiagnosticsState.lastRunError = undefined;
  runtimeDiagnosticsState.timeoutMs = DEFAULT_TIMEOUT_MS;
  runtimeDiagnosticsState.schemaValidationStatus = "unknown";
  runtimeDiagnosticsState.securityNote =
    "OpenClaw command execution is local-first. Treat stdout as untrusted until JSON parse and schema validation succeed.";
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

const executeConfiguredCommand = async (
  command: string,
  prompt: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> =>
  new Promise((resolve, reject) => {
    const importNodeChildProcess = async () => {
      const nodeChildProcessSpecifier = ["node", "child_process"].join(":");
      return import(nodeChildProcessSpecifier);
    };

    void importNodeChildProcess()
      .then(({ spawn }) => {
        const child = spawn("sh", ["-lc", command], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout.on("data", (chunk: { toString: () => string }) => {
          stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk: { toString: () => string }) => {
          stderr += chunk.toString();
        });

        child.on("error", (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });

        child.on("close", (code: number | null) => {
          clearTimeout(timeout);
          if (timedOut) {
            reject(new Error(`OpenClaw command timed out after ${timeoutMs}ms.`));
            return;
          }

          resolve({ stdout, stderr, exitCode: code });
        });

        child.stdin.write(prompt);
        child.stdin.end();
      })
      .catch(() => {
        reject(new Error("OpenClaw CLI is not available in this runtime."));
      });
  });

export const executeOpenClawResearchJob = async ({
  lead,
  runId,
  timeoutMs = getTimeoutMs(),
}: {
  lead: Lead;
  runId: string;
  timeoutMs?: number;
}): Promise<OpenClawResearchJobResult> => {
  const prompt = buildPrompt(lead);
  const command = runtimeEnv.OPENCLAW_COMMAND?.trim() ?? "";

  updateRuntimeDiagnostics({
    lastRunStatus: "running",
    lastRunError: undefined,
    timeoutMs,
    schemaValidationStatus: "unknown",
  });

  if (!command) {
    const mockResult = openClawResearchJobResultSchema.parse({
      ok: true,
      mode: "mock",
      prompt,
      stdout: "",
      stderr: "",
      result: buildMockResearch(lead),
    });

    updateRuntimeDiagnostics({
      lastRunStatus: "completed",
      schemaValidationStatus: "passed",
    });

    return mockResult;
  }

  try {
    const { stdout, stderr, exitCode } = await executeConfiguredCommand(command, prompt, timeoutMs);

    if (exitCode !== 0) {
      const errorMessage = compact([`OpenClaw command exited with code ${exitCode}.`, stderr.trim()]);
      const failed = openClawResearchJobResultSchema.parse({
        ok: false,
        mode: "openclaw-cli",
        prompt,
        stdout,
        stderr,
        error: errorMessage,
        failureCode: "command_exit_non_zero",
      });
      updateRuntimeDiagnostics({
        lastRunStatus: "failed",
        lastRunError: errorMessage,
        schemaValidationStatus: "unknown",
      });
      return failed;
    }

    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(stdout);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `OpenClaw output was not valid JSON: ${error.message}`
          : "OpenClaw output was not valid JSON.";
      const failed = openClawResearchJobResultSchema.parse({
        ok: false,
        mode: "openclaw-cli",
        prompt,
        stdout,
        stderr,
        error: errorMessage,
        failureCode: "invalid_json",
      });
      updateRuntimeDiagnostics({
        lastRunStatus: "failed",
        lastRunError: errorMessage,
        schemaValidationStatus: "failed",
      });
      return failed;
    }

    const parsedResult = researchLeadResultSchema.safeParse(parsedJson);

    if (!parsedResult.success) {
      const errorMessage = `OpenClaw output failed schema validation: ${parsedResult.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ")}`;
      const failed = openClawResearchJobResultSchema.parse({
        ok: false,
        mode: "openclaw-cli",
        prompt,
        stdout,
        stderr,
        error: errorMessage,
        failureCode: "schema_validation_failed",
      });
      updateRuntimeDiagnostics({
        lastRunStatus: "failed",
        lastRunError: errorMessage,
        schemaValidationStatus: "failed",
      });
      return failed;
    }

    const succeeded = openClawResearchJobResultSchema.parse({
      ok: true,
      mode: "openclaw-cli",
      prompt,
      stdout,
      stderr,
      result: parsedResult.data,
    });
    updateRuntimeDiagnostics({
      lastRunStatus: "completed",
      lastRunError: undefined,
      schemaValidationStatus: "passed",
    });
    return succeeded;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `OpenClaw execution failed for run ${runId}.`;
    const failureCode =
      message.includes("timed out")
        ? "timeout"
        : message.includes("not available")
          ? "command_spawn_failed"
          : "unknown";
    const failed = openClawResearchJobResultSchema.parse({
      ok: false,
      mode: "openclaw-cli",
      prompt,
      stdout: "",
      stderr: "",
      error: message,
      failureCode,
    });
    updateRuntimeDiagnostics({
      lastRunStatus: "failed",
      lastRunError: message,
      schemaValidationStatus: failureCode === "timeout" ? "unknown" : "failed",
    });
    return failed;
  }
};

export const runResearchLeadAction = async (
  lead: Lead,
): Promise<ResearchLeadExecution> => {
  const runId = `run-${Date.now()}`;
  const execution = await executeOpenClawResearchJob({ lead, runId });

  if (!execution.ok) {
    throw new Error(execution.error);
  }

  return {
    result: execution.result,
    mode: execution.mode,
    prompt: execution.prompt,
  };
};

export const getAgentConnectionStatus = (
  command = runtimeEnv.OPENCLAW_COMMAND,
): AgentConnectionStatus => ({
  configured: Boolean(command?.trim()),
  commandPreview: getCommandPreview(command),
  mode: command?.trim() ? "openclaw-cli" : "mock",
  ...runtimeDiagnosticsState,
});
