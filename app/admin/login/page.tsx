import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { demoSignInAction } from "@/actions/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Button } from "@/components/ui/Button";
import { CourtLines } from "@/components/ui/CourtLines";
import { Logo } from "@/components/ui/Logo";
import { getAdminUser } from "@/lib/auth/admin";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdminUser()) redirect("/admin");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;

  return (
    <main id="main" className="on-dark relative isolate flex min-h-dvh items-center justify-center bg-ink px-4 py-12 text-white">
      <CourtLines className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]" />
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-10 rounded-card bg-white p-6 text-ink shadow-lift sm:p-8">
          <h1 className="font-display text-4xl leading-none">Coach dashboard</h1>
          <p className="mt-2 text-sm text-muted">Sign in to manage bookings and availability.</p>

          <div className="mt-8">
            {isSupabaseConfigured ? (
              <LoginForm next={next} />
            ) : isDemoMode ? (
              <form action={demoSignInAction} className="space-y-4">
                {next && <input type="hidden" name="next" value={next} />}
                <p className="flex gap-3 rounded-xl bg-sky-50 p-4 text-sm leading-relaxed text-navy ring-1 ring-sky/40">
                  <FlaskConical aria-hidden className="mt-0.5 size-5 shrink-0" />
                  Supabase isn&apos;t configured yet, so the dashboard runs in local demo mode with sample data.
                </p>
                <Button type="submit" size="lg" className="w-full" arrow>
                  Enter demo dashboard
                </Button>
              </form>
            ) : (
              <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger">
                Authentication is not configured. Set the Supabase environment variables to enable the dashboard.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
