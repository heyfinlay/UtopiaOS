import { useMemo, useState } from "react";

type AuthMode = "signin" | "signup" | "reset";

type AuthScreenProps = {
  authReady: boolean;
  loading?: boolean;
  message?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
};

const modeCopy: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
    submittingLabel: string;
  }
> = {
  signin: {
    eyebrow: "Operator Access",
    title: "Sign in and get back to work.",
    description:
      "Use the Supabase account that owns the workspace so lead data, activity, approvals, and delivery records resolve correctly.",
    submitLabel: "Sign In",
    submittingLabel: "Signing In...",
  },
  signup: {
    eyebrow: "New Workspace Operator",
    title: "Create the first real operator account.",
    description:
      "Set up a proper login instead of relying on internal-tool vibes. This account becomes the clean entry point into the CRM.",
    submitLabel: "Create Account",
    submittingLabel: "Creating Account...",
  },
  reset: {
    eyebrow: "Access Recovery",
    title: "Reset your password cleanly.",
    description:
      "Enter the email tied to this workspace and Supabase will send a reset link if the account exists.",
    submitLabel: "Send Reset Link",
    submittingLabel: "Sending...",
  },
};

const statusTone = (text: string | null | undefined) => {
  const normalized = text?.toLowerCase() ?? "";

  if (
    normalized.includes("created") ||
    normalized.includes("sent") ||
    normalized.includes("ready") ||
    normalized.includes("check your email")
  ) {
    return "border-emerald-300/35 bg-emerald-200/20 text-emerald-950";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("invalid") ||
    normalized.includes("missing") ||
    normalized.includes("error") ||
    normalized.includes("expired")
  ) {
    return "border-rose-300/35 bg-rose-200/20 text-rose-950";
  }

  return "border-black bg-white text-black";
};

export function AuthScreen({
  authReady,
  loading = false,
  message,
  onSignIn,
  onSignUp,
  onResetPassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const copy = modeCopy[mode];

  const helperPoints = useMemo(
    () => [
      "Leads, approvals, and client records are owner-scoped.",
      "Use one clean operator account instead of testing anonymously.",
      "If auth fails here, the CRM will feel broken everywhere else.",
    ],
    [],
  );

  const submit = async () => {
    setSubmitting(true);
    setLocalMessage(null);

    try {
      if (mode === "signin") {
        await onSignIn(email, password);
        setLocalMessage("Signed in. Loading your workspace now.");
      } else if (mode === "signup") {
        await onSignUp(email, password);
        setLocalMessage(
          "Account created. If Supabase requires email confirmation, check your inbox before signing in.",
        );
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      } else {
        await onResetPassword(email);
        setLocalMessage("Reset link sent. Check your email and finish the password reset flow.");
      }
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPrimaryAction = () => {
    if (!authReady || loading || submitting) {
      return;
    }

    if (email.trim() === "") {
      setLocalMessage("Enter the email tied to this workspace.");
      return;
    }

    if (mode !== "reset" && password.trim() === "") {
      setLocalMessage("Enter your password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setLocalMessage("Use at least 8 characters so the account is actually usable.");
        return;
      }

      if (password !== confirmPassword) {
        setLocalMessage("Passwords do not match yet.");
        return;
      }
    }

    void submit();
  };

  const disabled = submitting || loading || !authReady;
  const diagnosticLabel = authReady
    ? "SUPABASE AUTH: READY"
    : "SUPABASE AUTH: NOT CONFIGURED";
  const resolvedMessage =
    localMessage ??
    message ??
    (mode === "reset"
      ? "Need a reset link? Enter your email and I’ll route it through Supabase."
      : "Awaiting credentials.");

  return (
    <div className="min-h-screen bg-[#b8b8b8] text-black">
      <div className="border-b-2 border-black bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-[0_2px_0_0_#7f7f7f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>Utopia OS</span>
          <span>Operator Auth</span>
        </div>
      </div>

      <div
        className="flex min-h-[calc(100vh-38px)] items-center justify-center px-4 py-8"
        style={{
          backgroundImage:
            "radial-gradient(#8d8d8d 0.8px, transparent 0.8px), radial-gradient(#d6d6d6 0.8px, transparent 0.8px)",
          backgroundPosition: "0 0, 6px 6px",
          backgroundSize: "12px 12px",
        }}
      >
        <div className="grid w-full max-w-6xl gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="border-2 border-black bg-[#d8d8d8] shadow-[6px_6px_0_0_#4a4a4a]">
            <div className="border-b-2 border-black bg-[linear-gradient(90deg,#111_0%,#3c3c3c_100%)] px-3 py-2 text-[12px] font-bold uppercase tracking-[0.22em] text-white">
              Access Brief
            </div>

            <div className="space-y-5 p-5">
              <div className="border-2 border-black bg-[linear-gradient(180deg,#f6f6f6_0%,#dbdbdb_100%)] p-4 shadow-[inset_1px_1px_0_0_#fff,inset_-1px_-1px_0_0_#7f7f7f]">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-700">
                  Workspace Reality
                </p>
                <h1 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold leading-tight text-black sm:text-4xl">
                  Proper login for a real operator CRM.
                </h1>
                <p className="mt-3 max-w-md text-[13px] leading-6 text-slate-700">
                  No more vague internal-tool access gate. This flow should make first-run setup,
                  sign-in, and account recovery obvious.
                </p>
              </div>

              <div className="grid gap-3">
                {helperPoints.map((point) => (
                  <div
                    key={point}
                    className="flex gap-3 border-2 border-black bg-white px-3 py-3 text-[12px] leading-5 shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f]"
                  >
                    <span className="mt-[2px] h-2.5 w-2.5 shrink-0 rounded-full border border-black bg-emerald-400" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-2 border-black bg-white px-3 py-3 text-[11px] font-bold uppercase tracking-[0.18em] shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f]">
                  <div className="text-slate-500">Auth State</div>
                  <div className="mt-2 text-[13px] text-black">{diagnosticLabel}</div>
                </div>
                <div className="border-2 border-black bg-white px-3 py-3 text-[11px] font-bold uppercase tracking-[0.18em] shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f]">
                  <div className="text-slate-500">Session</div>
                  <div className="mt-2 text-[13px] text-black">
                    {loading ? "INITIALIZING" : "AWAITING OPERATOR"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-2 border-black bg-[#d8d8d8] shadow-[6px_6px_0_0_#4a4a4a]">
            <div className="border-b-2 border-black bg-[linear-gradient(90deg,#111_0%,#3c3c3c_100%)] px-3 py-2 text-[12px] font-bold uppercase tracking-[0.22em] text-white">
              Access Panel
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ["signin", "Sign In"],
                  ["signup", "Create Account"],
                  ["reset", "Reset Password"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`border-2 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                      mode === value
                        ? "border-black bg-black text-white shadow-[inset_1px_1px_0_0_#7f7f7f]"
                        : "border-black bg-[#efefef] text-black shadow-[inset_1px_1px_0_0_#fff,inset_-1px_-1px_0_0_#7f7f7f]"
                    }`}
                    onClick={() => {
                      setMode(value);
                      setLocalMessage(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="border-2 border-black bg-white p-4 shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f]">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold leading-tight text-black sm:text-3xl">
                  {copy.title}
                </h2>
                <p className="mt-3 max-w-2xl text-[13px] leading-6 text-slate-700">
                  {copy.description}
                </p>
              </div>

              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  onPrimaryAction();
                }}
              >
                <label className="grid gap-1 text-[12px] font-bold uppercase tracking-[0.18em]">
                  <span>Email</span>
                  <input
                    className="border-2 border-black bg-white px-3 py-3 text-[14px] shadow-[inset_1px_1px_0_0_#7f7f7f,inset_-1px_-1px_0_0_#f5f5f5] outline-none"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="operator@temporaryutopia.com"
                  />
                </label>

                {mode !== "reset" ? (
                  <label className="grid gap-1 text-[12px] font-bold uppercase tracking-[0.18em]">
                    <span>Password</span>
                    <input
                      className="border-2 border-black bg-white px-3 py-3 text-[14px] shadow-[inset_1px_1px_0_0_#7f7f7f,inset_-1px_-1px_0_0_#f5f5f5] outline-none"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      placeholder={mode === "signup" ? "Use at least 8 characters" : "Enter your password"}
                    />
                  </label>
                ) : null}

                {mode === "signup" ? (
                  <label className="grid gap-1 text-[12px] font-bold uppercase tracking-[0.18em]">
                    <span>Confirm Password</span>
                    <input
                      className="border-2 border-black bg-white px-3 py-3 text-[14px] shadow-[inset_1px_1px_0_0_#7f7f7f,inset_-1px_-1px_0_0_#f5f5f5] outline-none"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="Repeat the password"
                    />
                  </label>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="min-w-[180px] border-2 border-black bg-black px-4 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-white shadow-[inset_1px_1px_0_0_#7f7f7f] disabled:opacity-60"
                    disabled={disabled}
                  >
                    {submitting ? copy.submittingLabel : copy.submitLabel}
                  </button>

                  {mode === "signin" ? (
                    <button
                      type="button"
                      className="min-w-[180px] border-2 border-black bg-[#efefef] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.18em] shadow-[inset_1px_1px_0_0_#fff,inset_-1px_-1px_0_0_#7f7f7f]"
                      onClick={() => {
                        setMode("signup");
                        setLocalMessage(null);
                      }}
                    >
                      Need an Account?
                    </button>
                  ) : null}

                  {mode !== "reset" ? (
                    <button
                      type="button"
                      className="border-2 border-black bg-[#efefef] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.18em] shadow-[inset_1px_1px_0_0_#fff,inset_-1px_-1px_0_0_#7f7f7f]"
                      onClick={() => {
                        setMode("reset");
                        setLocalMessage(null);
                      }}
                    >
                      Forgot Password
                    </button>
                  ) : null}
                </div>
              </form>

              <div
                className={`min-h-16 border-2 px-3 py-3 text-[12px] leading-5 shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f] ${statusTone(
                  resolvedMessage,
                )}`}
              >
                {resolvedMessage}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
