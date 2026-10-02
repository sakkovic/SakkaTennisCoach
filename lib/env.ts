/**
 * Runtime environment flags.
 *
 * Demo mode: when Supabase is not configured we fall back to an in-memory store
 * so the full booking + admin flow can be exercised locally. It is never enabled
 * in production unless DEMO_MODE=true is set explicitly.
 */
// Supabase is only used on the server, so the names work with or without the NEXT_PUBLIC_ prefix.
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
export const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ""
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const isDemoMode =
  !isSupabaseConfigured && (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true");

/** Whether online booking can work at all in this environment. */
export const isBookingEnabled = isSupabaseConfigured || isDemoMode;

export const DEMO_ADMIN_COOKIE = "ssk_demo_admin";
