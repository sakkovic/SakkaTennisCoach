import { z } from "zod";
import { en } from "@/lib/i18n/dictionaries/en";
import type { Dictionary } from "@/lib/i18n/config-types";
import { makeEmailSchema } from "./booking";

export const makeContactSchema = (m: Dictionary["validation"]) =>
  z.object({
    name: z.string().trim().min(1, m.contactName).max(120, m.nameTooLong),
    email: makeEmailSchema(m),
    phone: z
      .string()
      .trim()
      .max(32, m.contactPhone)
      .refine((v) => v === "" || /^\+?[\d\s().-]{6,24}$/.test(v), m.contactPhone)
      .optional(),
    message: z.string().trim().min(10, m.contactMessage).max(5000, m.messageTooLong),
    website: z.string().max(0).optional(),
  });

export const contactSchema = makeContactSchema(en.validation);

export type ContactInput = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;
