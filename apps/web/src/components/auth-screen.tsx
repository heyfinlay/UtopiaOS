import { useState } from "react";

type AuthScreenProps = {
  authReady: boolean;
  demoMode: boolean;
  loading?: boolean;
  message?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
};

export function AuthScreen({
  authReady,
  demoMode,
  loading = false,
  message,
  onSignIn,
  onSignUp,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setLocalMessage(null);

    try {
      if (mode === "signin") {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setLocalMessage("Account created. Sign in if a session was not started automatically.");
        setMode("signin");
      }
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || loading || email.trim() === "" || password.trim() === "";
  const diagnosticLabel = demoMode
    ? "DEMO MODE"
    : authReady
      ? "SUPABASE AUTH: READY"
      : "SUPABASE AUTH: NOT CONFIGURED";

  return (
    <div className="min-h-screen bg-[#b8b8b8] text-black">
      <div className="border-b-2 border-black bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-[0_2px_0_0_#7f7f7f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>Utopia OS</span>
          <span>Special</span>
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
        <div className="w-full max-w-[560px] border-2 border-black bg-[#d8d8d8] shadow-[6px_6px_0_0_#4a4a4a]">
          <div className="border-b-2 border-black bg-[linear-gradient(90deg,#111_0%,#3c3c3c_100%)] px-3 py-2 text-[12px] font-bold uppercase tracking-[0.22em] text-white">
            ACCESS GATE
          </div>

          <div className="space-y-4 p-5">
            <div className="border-2 border-black bg-white px-3 py-2 text-[12px] leading-5 shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f]">
              Sign in with the Supabase user account that owns this workspace data.
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-[12px] font-bold uppercase tracking-[0.18em]">
                <span>Email</span>
                <input
                  className="border-2 border-black bg-white px-3 py-2 text-[14px] shadow-[inset_1px_1px_0_0_#7f7f7f,inset_-1px_-1px_0_0_#f5f5f5] outline-none"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>

              <label className="grid gap-1 text-[12px] font-bold uppercase tracking-[0.18em]">
                <span>Password</span>
                <input
                  className="border-2 border-black bg-white px-3 py-2 text-[14px] shadow-[inset_1px_1px_0_0_#7f7f7f,inset_-1px_-1px_0_0_#f5f5f5] outline-none"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="min-w-[140px] border-2 border-black bg-[#efefef] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] shadow-[inset_1px_1px_0_0_#fff,inset_-1px_-1px_0_0_#7f7f7f] disabled:opacity-60"
                disabled={disabled || !authReady}
                onClick={() => {
                  setMode("signin");
                  void submit();
                }}
              >
                {submitting && mode === "signin" ? "Signing In..." : "Sign In"}
              </button>
              <button
                type="button"
                className="min-w-[160px] border-2 border-black bg-[#efefef] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] shadow-[inset_1px_1px_0_0_#fff,inset_-1px_-1px_0_0_#7f7f7f] disabled:opacity-60"
                disabled={disabled || !authReady}
                onClick={() => {
                  setMode("signup");
                  void submit();
                }}
              >
                {submitting && mode === "signup" ? "Creating..." : "Create Account"}
              </button>
            </div>

            <div className="min-h-12 border-2 border-black bg-white px-3 py-2 text-[12px] leading-5 shadow-[inset_1px_1px_0_0_#f5f5f5,inset_-1px_-1px_0_0_#7f7f7f]">
              {localMessage ?? message ?? "Awaiting credentials."}
            </div>

            <div className="flex items-center justify-between border-t-2 border-black pt-3 text-[11px] font-bold uppercase tracking-[0.18em]">
              <span>{diagnosticLabel}</span>
              <span>{loading ? "SESSION: LOADING" : "SESSION: STANDBY"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
