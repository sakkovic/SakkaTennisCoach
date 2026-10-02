import type { Metadata } from "next";
import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Authorization boundary for every admin page (the proxy only does an optimistic check).
  const admin = await requireAdmin();

  return (
    <div className="min-h-dvh bg-surface">
      <Sidebar email={admin.email} demo={admin.demo} />
      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
