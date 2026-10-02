"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { playerLevels } from "@/content/coaching";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import type { Service } from "@/lib/booking/types";
import { fill } from "@/lib/i18n/config";
import { makePlayerDetailsSchema, type PlayerDetails, type PlayerDetailsInput } from "@/lib/validation/booking";
import { Checkbox, describedBy, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { StepHeading } from "./StepHeading";

export const PLAYER_FORM_ID = "player-details-form";

type Props = {
  service: Service;
  defaultValues: Partial<PlayerDetailsInput>;
  onSubmit: (values: PlayerDetails) => void;
  onChange?: (values: Partial<PlayerDetailsInput>) => void;
};

export function PlayerForm({ service, defaultValues, onSubmit, onChange }: Props) {
  const { t } = useI18n();
  const b = t.booking;
  // Error messages in the visitor's language
  const schema = useMemo(() => makePlayerDetailsSchema(t.validation), [t]);

  const {
    register,
    handleSubmit,
    subscribe,
    control,
    formState: { errors },
  } = useForm<PlayerDetailsInput, unknown, PlayerDetails>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      playersCount: Math.max(service.minPlayers, Math.min(defaultValues.playersCount ?? service.minPlayers, service.maxPlayers)),
      ...defaultValues,
      consent: defaultValues.consent === true ? true : undefined,
    },
  });

  // Persist a draft (sessionStorage in the wizard) so nothing is lost on back/refresh.
  useEffect(() => {
    if (!onChange) return;
    return subscribe({ formState: { values: true }, callback: ({ values }) => onChange(values) });
  }, [subscribe, onChange]);

  const selectedLevel = useWatch({ control, name: "playerLevel" });
  const playerOptions = Array.from({ length: service.maxPlayers - service.minPlayers + 1 }, (_, i) => service.minPlayers + i);

  return (
    <form id={PLAYER_FORM_ID} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <StepHeading title={b.detailsTitle} text={b.detailsText} />

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">{b.contactInfo}</legend>
        <Field id="firstName" label={b.firstName} required error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" invalid={!!errors.firstName} aria-describedby={describedBy("firstName", errors.firstName?.message)} {...register("firstName")} />
        </Field>
        <Field id="lastName" label={b.lastName} required error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" invalid={!!errors.lastName} aria-describedby={describedBy("lastName", errors.lastName?.message)} {...register("lastName")} />
        </Field>
        <Field id="email" label={b.email} required error={errors.email?.message} hint={b.emailHint}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            invalid={!!errors.email}
            aria-describedby={describedBy("email", errors.email?.message, "hint")}
            {...register("email")}
          />
        </Field>
        <Field id="phone" label={b.phone} required error={errors.phone?.message} hint={b.phoneHint}>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" invalid={!!errors.phone} aria-describedby={describedBy("phone", errors.phone?.message, "hint")} {...register("phone")} />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">
          {b.playerLevel}
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {playerLevels.map((level) => (
            <label
              key={level}
              className={cn(
                "relative flex min-h-12 cursor-pointer items-center justify-center rounded-full border px-3 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                selectedLevel === level ? "border-ink bg-ink text-lime" : "border-line bg-white hover:border-ink/40",
                errors.playerLevel && selectedLevel !== level && "border-danger/60",
              )}
            >
              <input type="radio" value={level} className="sr-only" {...register("playerLevel")} />
              {t.levels[level].title}
            </label>
          ))}
        </div>
        {errors.playerLevel && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {errors.playerLevel.message}
          </p>
        )}
      </fieldset>

      {service.maxPlayers > 1 && (
        <Field id="playersCount" label={b.playersCount} required hint={fill(b.playersHint, { options: playerOptions.join(` ${b.or} `) })}>
          <Select id="playersCount" aria-describedby="playersCount-hint" {...register("playersCount", { valueAsNumber: true })}>
            {playerOptions.map((n) => (
              <option key={n} value={n}>
                {fill(b.playersOption, { n })}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field id="notes" label={b.notes} error={errors.notes?.message} hint={b.notesHint}>
        <Textarea id="notes" rows={4} invalid={!!errors.notes} aria-describedby={describedBy("notes", errors.notes?.message, "hint")} {...register("notes")} />
      </Field>

      {/* Honeypot — hidden from humans and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
          <Checkbox className="mt-0.5" aria-invalid={!!errors.consent || undefined} {...register("consent")} />
          <span>
            {b.consent}{" "}
            <LocaleLink href="/privacy" target="_blank" className="font-medium text-ink underline underline-offset-2">
              {b.privacyLink}
            </LocaleLink>
            .
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {errors.consent.message}
          </p>
        )}
      </div>
    </form>
  );
}
