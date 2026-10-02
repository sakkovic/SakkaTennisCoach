"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { sendContactAction } from "@/actions/contact";
import { makeContactSchema, type ContactInput, type ContactValues } from "@/lib/validation/contact";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/Field";

export function ContactForm() {
  const { t, locale } = useI18n();
  const c = t.contact;
  const schema = useMemo(() => makeContactSchema(t.validation), [t]);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactInput, unknown, ContactValues>({ resolver: zodResolver(schema), mode: "onTouched" });

  const onSubmit = (values: ContactValues) =>
    startTransition(async () => {
      const result = await sendContactAction(values, locale);
      if (result.ok) {
        reset();
        setSent(true);
        toast.success(c.sentToast);
        return;
      }
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ContactInput, { message: messages[0] });
      }
      toast.error(result.message);
    });

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center rounded-card border border-line bg-white p-10 text-center shadow-soft">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-lime text-ink">
          <CircleCheck aria-hidden className="size-7" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">{c.sentTitle}</h2>
        <p className="mt-2 max-w-sm text-muted">{c.sentText}</p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          {c.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-card border border-line bg-white p-6 shadow-soft md:p-8" aria-label={c.form}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label={c.name} required error={errors.name?.message}>
          <Input id="c-name" autoComplete="name" invalid={!!errors.name} aria-describedby={describedBy("c-name", errors.name?.message)} {...register("name")} />
        </Field>
        <Field id="c-phone" label={c.phone} error={errors.phone?.message}>
          <Input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" invalid={!!errors.phone} aria-describedby={describedBy("c-phone", errors.phone?.message)} {...register("phone")} />
        </Field>
      </div>
      <Field id="c-email" label={c.email} required error={errors.email?.message}>
        <Input id="c-email" type="email" inputMode="email" autoComplete="email" invalid={!!errors.email} aria-describedby={describedBy("c-email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field id="c-message" label={c.message} required error={errors.message?.message} hint={c.messageHint}>
        <Textarea id="c-message" rows={6} invalid={!!errors.message} aria-describedby={describedBy("c-message", errors.message?.message, "hint")} {...register("message")} />
      </Field>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Button type="submit" size="lg" loading={pending} icon={<Send aria-hidden className="size-4" />} className="w-full sm:w-auto">
        {pending ? c.sending : c.send}
      </Button>
    </form>
  );
}
