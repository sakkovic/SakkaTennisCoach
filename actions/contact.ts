"use server";

import { after } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { isBookingEnabled } from "@/lib/env";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { sendContactNotification } from "@/lib/notifications/email";
import { makeContactSchema } from "@/lib/validation/contact";

export type ContactState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

export async function sendContactAction(payload: unknown, lang: string = "en"): Promise<ContactState> {
  const t = getDictionary(hasLocale(lang) ? lang : "en");
  const parsed = makeContactSchema(t.validation).safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: t.contact.checkFields, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { website, ...data } = parsed.data;
  if (website) return { ok: true }; // honeypot: pretend success for bots

  const message = { name: data.name, email: data.email, phone: data.phone || null, message: data.message };

  if (isBookingEnabled) {
    const result = await getRepository().createContactMessage(message);
    if (!result.ok) return { ok: false, message: t.contact.error };
  }

  after(() => sendContactNotification(message));
  return { ok: true };
}
