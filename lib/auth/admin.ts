import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DEMO_ADMIN_COOKIE, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string; demo: boolean };

/**
 * Returns the signed-in admin, or null. Checks the `profiles.role = 'admin'`
 * flag through the `is_admin()` Postgres function — being signed in is not enough.
 * Memoized per request.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  // Auth always depends on the incoming request — never prerender admin pages.
  await connection();
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: isAdmin } = await supabase.rpc("is_admin");
    return isAdmin ? { id: user.id, email: user.email ?? "", demo: false } : null;
  }
  if (isDemoMode) {
    const store = await cookies();
    return store.get(DEMO_ADMIN_COOKIE)?.value === "1" ? { id: "demo", email: "demo@localhost", demo: true } : null;
  }
  return null;
});

/** Use at the top of every admin page and admin Server Action. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login?error=unauthorized");
  return user;
}
