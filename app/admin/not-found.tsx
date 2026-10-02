import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function AdminNotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-surface px-5">
      <div className="text-center">
        <p className="font-display text-7xl text-ink">404</p>
        <h1 className="mt-2 text-xl font-semibold">This dashboard page doesn&apos;t exist</h1>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/admin" variant="secondary">
            Go to dashboard
          </ButtonLink>
        </div>
        <p className="mt-6 text-sm text-muted">
          <Link href="/" className="underline">
            View website
          </Link>
        </p>
      </div>
    </main>
  );
}
