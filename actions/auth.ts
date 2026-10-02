"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_ADMIN_COOKIE, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address.")),
  password: z.string().min(1, "Please enter your password."),
  next: z.string().optional(),
});

/** Only allow redirects to admin pages (prevents open redirects). */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid credentials.", email };
  if (!isSupabaseConfigured) return { error: "Authentication is not configured.", email };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: "Incorrect email or password.", email };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "This account does not have admin access.", email };
  }
  redirect(safeNext(parsed.data.next));
}

export async function demoSignInAction(formData: FormData) {
  if (!isDemoMode) return;
  const store = await cookies();
  store.set(DEMO_ADMIN_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(DEMO_ADMIN_COOKIE);
  redirect("/admin/login");
}
