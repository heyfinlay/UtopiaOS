import type { PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { SystemStatus } from "@utopia/schemas";
import { AuthScreen } from "@/components/auth-screen";
import { useAuth } from "@/providers/auth-provider";

type AuthGateViewProps = PropsWithChildren<{
  authConfigured: boolean;
  authLoading: boolean;
  authRequired: boolean;
  currentUserAuthenticated: boolean;
  demoMode: boolean;
  message?: string | null;
  statusLoading?: boolean;
  statusError?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}>;

export function AuthGateView({
  authConfigured,
  authLoading,
  authRequired,
  currentUserAuthenticated,
  demoMode,
  message,
  statusLoading = false,
  statusError = null,
  onSignIn,
  onSignUp,
  children,
}: AuthGateViewProps) {
  if (statusLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#b8b8b8] text-[12px] font-bold uppercase tracking-[0.2em] text-black">
        Initializing Access Gate
      </div>
    );
  }

  if (!authRequired || currentUserAuthenticated || demoMode) {
    return <>{children}</>;
  }

  if (!authConfigured) {
    return (
      <AuthScreen
        authReady={false}
        demoMode={false}
        message={
          statusError ??
          message ??
          "Browser Supabase Auth is not configured. Set VITE_SUPABASE_URL and a publishable or anon key."
        }
        onSignIn={onSignIn}
        onSignUp={onSignUp}
      />
    );
  }

  return (
    <AuthScreen
      authReady
      demoMode={false}
      message={statusError ?? message}
      onSignIn={onSignIn}
      onSignUp={onSignUp}
    />
  );
}

const isDemoModeAllowed = (status: SystemStatus | undefined, authConfigured: boolean) =>
  !status?.authRequired && status?.repositoryMode === "memory" && !authConfigured;

export function AuthGate({ children }: PropsWithChildren) {
  const { authConfigured, loading, session, authMessage, signIn, signUp } = useAuth();
  const systemStatusQuery = useQuery({
    queryKey: ["system-status"],
    queryFn: api.getSystemStatus,
    retry: false,
    staleTime: 20_000,
  });

  return (
    <AuthGateView
      authConfigured={authConfigured}
      authLoading={loading}
      authRequired={systemStatusQuery.data?.authRequired ?? false}
      currentUserAuthenticated={Boolean(session?.user)}
      demoMode={isDemoModeAllowed(systemStatusQuery.data, authConfigured)}
      message={authMessage}
      statusLoading={systemStatusQuery.isLoading}
      statusError={systemStatusQuery.error instanceof Error ? systemStatusQuery.error.message : null}
      onSignIn={signIn}
      onSignUp={signUp}
    >
      {children}
    </AuthGateView>
  );
}
