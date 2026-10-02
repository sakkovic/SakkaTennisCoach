"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="on-dark flex min-h-[80svh] items-center justify-center bg-ink px-5 pt-20 text-white">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl text-lime">{t.error.big}</p>
        <h1 className="font-display mt-2 text-4xl">{t.error.title}</h1>
        <p className="mt-4 text-white/70">{t.error.text}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} icon={<RotateCw aria-hidden className="size-4" />}>
            {t.error.retry}
          </Button>
          <ButtonLink href="/" variant="outline-dark">
            {t.common.backHome}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
