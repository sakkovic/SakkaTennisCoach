"use client";

import { ButtonLink } from "@/components/ui/Button";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { useI18n } from "@/components/i18n/I18nProvider";

export function NotFoundContent() {
  const { t } = useI18n();
  return (
    <div className="m-auto max-w-xl py-20 text-center">
      <p className="font-display text-[9rem] leading-none text-lime">{t.notFound.big}</p>
      <h1 className="font-display mt-2 text-5xl">{t.notFound.title}</h1>
      <p className="mt-4 text-white/70">{t.notFound.text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/" arrow>
          {t.common.backHome}
        </ButtonLink>
        <ButtonLink href="/booking" variant="outline-dark">
          {t.common.bookLesson}
        </ButtonLink>
      </div>
      <p className="mt-8 text-sm text-white/50">
        {t.notFound.help}{" "}
        <LocaleLink href="/contact" className="underline hover:text-white">
          {t.notFound.contact}
        </LocaleLink>
      </p>
    </div>
  );
}
