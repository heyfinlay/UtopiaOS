import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { API_UNAUTHORIZED_EVENT, setAccessTokenProvider } from "@/lib/api";
import {
  hasSupabaseBrowserAuth,
  supabase,
  supabaseBrowserAuthMessage,
} from "@/lib/supabase";

type AuthContextValue = {
  authConfigured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  authMessage: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: (message?: string | null) => Promise<void>;
  clearAuthMessage: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getSafeMessage = (fallback: string, error: unknown) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => hasSupabaseBrowserAuth);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    setAccessTokenProvider(async () => sessionRef.current?.access_token ?? null);

    if (!supabase) {
      return () => setAccessTokenProvider(null);
    }

    const supabaseClient = supabase;

    let active = true;

    void supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error) {
        console.error("Failed to load Supabase session", error);
      }

      const nextSession = data.session ?? null;
      sessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const handleUnauthorized = (event: Event) => {
      const detail =
        event instanceof CustomEvent && typeof event.detail?.message === "string"
          ? event.detail.message
          : "Session expired. Please sign in again.";
      setAuthMessage(detail);
      sessionRef.current = null;
      setSession(null);
      setUser(null);
      void supabaseClient.auth.signOut().catch((error) => {
        console.error("Failed to clear Supabase session after 401", error);
      });
    };

    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      active = false;
      data.subscription.unsubscribe();
      window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
      setAccessTokenProvider(null);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error("Supabase Auth is not configured for the browser.");
    }

    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(getSafeMessage("Sign in failed.", error));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error("Supabase Auth is not configured for the browser.");
    }

    setAuthMessage(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(getSafeMessage("Account creation failed.", error));
    }
  }, []);

  const signOut = useCallback(async (message?: string | null) => {
    if (message) {
      setAuthMessage(message);
    } else {
      setAuthMessage(null);
    }

    if (!supabase) {
      sessionRef.current = null;
      setSession(null);
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(getSafeMessage("Sign out failed.", error));
    }

    sessionRef.current = null;
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authConfigured: hasSupabaseBrowserAuth,
      loading,
      session,
      user,
      authMessage: authMessage ?? supabaseBrowserAuthMessage,
      signIn,
      signUp,
      signOut,
      clearAuthMessage: () => setAuthMessage(null),
    }),
    [authMessage, loading, session, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
};
