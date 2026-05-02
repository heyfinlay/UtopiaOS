import type { PropsWithChildren } from "react";

import { AuthScreen } from "@/components/auth-screen";
import { useAuth } from "@/providers/auth-provider";

type AuthGateViewProps = PropsWithChildren<{
  authConfigured: boolean;
  authLoading: boolean;
  currentUserAuthenticated: boolean;
  message?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}>;

export function AuthGateView({
  authConfigured,
  authLoading,
  currentUserAuthenticated,
  message,
  onSignIn,
  onSignUp,
  onResetPassword,
  children,
}: AuthGateViewProps) {
  if (!authConfigured) {
    return (
      <AuthScreen
        authReady={false}
        message={
          message ??
          "Browser Supabase Auth is required. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY."
        }
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onResetPassword={onResetPassword}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#b8b8b8] text-[12px] font-bold uppercase tracking-[0.2em] text-black">
        Initializing authenticated session
      </div>
    );
  }

  if (currentUserAuthenticated) {
    return <>{children}</>;
  }

  return (
    <AuthScreen
      authReady
      message={message}
      onSignIn={onSignIn}
      onSignUp={onSignUp}
      onResetPassword={onResetPassword}
    />
  );
}

export function AuthGate({ children }: PropsWithChildren) {
  const {
    authConfigured,
    loading,
    session,
    authMessage,
    signIn,
    signUp,
    resetPassword,
  } = useAuth();

  return (
    <AuthGateView
      authConfigured={authConfigured}
      authLoading={loading}
      currentUserAuthenticated={Boolean(session?.user)}
      message={authMessage}
      onSignIn={signIn}
      onSignUp={signUp}
      onResetPassword={resetPassword}
    >
      {children}
    </AuthGateView>
  );
}
