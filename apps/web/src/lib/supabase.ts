import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  "";

export const missingSupabaseBrowserEnvVars = [
  !supabaseUrl ? "VITE_SUPABASE_URL" : null,
  !supabasePublishableKey
    ? "VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY"
    : null,
].filter(Boolean) as string[];

export const hasSupabaseBrowserAuth = Boolean(supabaseUrl && supabasePublishableKey);
export const supabaseBrowserAuthMessage = hasSupabaseBrowserAuth
  ? null
  : `Missing browser auth configuration: ${missingSupabaseBrowserEnvVars.join(", ")}.`;

export const supabase = hasSupabaseBrowserAuth
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
