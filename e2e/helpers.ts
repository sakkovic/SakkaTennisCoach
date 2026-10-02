import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { formatDateLong } from "../lib/booking/time";
import { en } from "../lib/i18n/dictionaries/en";
import { fr } from "../lib/i18n/dictionaries/fr";

export const dict = { en, fr };
export type Lang = keyof typeof dict;
export const prefix = (lang: Lang) => (lang === "fr" ? "/fr" : "");

/** Demo-mode ids (lib/data/demo-seed.ts). */
export const DEMO = { privateLesson: "svc-private", semi: "svc-semi", location: "loc-hammam-sousse" } as const;

export type Booked = { reference: string; date: string; time: string };

/** Today in the coach's timezone, YYYY-MM-DD. */
export const tunisToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Tunis" });
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Available dates for a service this month and next (same API the calendar uses). */
export async function availableDates(request: APIRequestContext, service: string) {
  const today = tunisToday();
  const months = [today.slice(0, 7), addDays(`${today.slice(0, 7)}-01`, 32).slice(0, 7)];
  const all: string[] = [];
  let lastBookable = "";
  for (const month of months) {
    const r = await request.get(`/api/availability?service=${service}&location=${DEMO.location}&month=${month}`);
    expect(r.ok()).toBeTruthy();
    const body = (await r.json()) as { dates: string[]; lastBookable: string };
    all.push(...body.dates);
    lastBookable = body.lastBookable;
  }
  return { dates: [...new Set(all)].sort(), lastBookable, today };
}

export async function availableSlots(request: APIRequestContext, service: string, date: string) {
  const r = await request.get(`/api/availability?service=${service}&location=${DEMO.location}&date=${date}`);
  expect(r.ok()).toBeTruthy();
  return ((await r.json()) as { slots: Array<{ start: string; end: string }> }).slots.map((s) => s.start);
}

type BookOptions = {
  lang?: Lang;
  service: RegExp | string;
  pack?: RegExp | string; // plan card name; omit for single lesson
  first: string;
  last: string;
  email: string;
  phone?: string;
  level?: keyof typeof en.levels;
  notes?: string;
  /** Choose this date (must be available); default = the one the calendar opens on */
  date?: string;
  /** Choose this start time; default = the first available slot */
  time?: string;
};

/** Goes through the whole public booking wizard and returns the reference. */
export async function bookLesson(page: Page, o: BookOptions): Promise<Booked> {
  const lang = o.lang ?? "en";
  const t = dict[lang];
  await page.goto(`${prefix(lang)}/booking`);

  // 1. Lesson (+ plan)
  await page.getByRole("radiogroup", { name: t.booking.lessonType }).getByRole("radio", { name: o.service }).click();
  if (o.pack) await page.getByRole("radio", { name: o.pack }).click();
  await page.getByRole("button", { name: t.booking.continue, exact: true }).click();

  // 2. Date & time (location is skipped: a single court)
  await expect(page).toHaveURL(/step=datetime/);
  if (o.date) await page.getByRole("button", { name: dayLabel(o.date, lang), exact: true }).click();
  const times = page.getByRole("radiogroup", { name: new RegExp(t.booking.timesOn.split("{date}")[0]) });
  await expect(times.getByRole("radio").first()).toBeVisible();
  const slot = o.time ? times.getByRole("radio", { name: new RegExp(`^${o.time} `) }) : times.getByRole("radio").first();
  const time = ((await slot.getAttribute("aria-label")) ?? "").slice(0, 5);
  await slot.click();
  const date = new URL(page.url()).searchParams.get("date") ?? "";
  await page.getByRole("button", { name: t.booking.continue, exact: true }).click();

  // 3. Details
  await page.getByRole("textbox", { name: t.booking.firstName, exact: true }).fill(o.first);
  await page.getByRole("textbox", { name: t.booking.lastName, exact: true }).fill(o.last);
  await page.getByRole("textbox", { name: t.booking.email, exact: true }).fill(o.email);
  await page.getByRole("textbox", { name: t.booking.phone, exact: true }).fill(o.phone ?? "+216 20 123 456");
  await page.getByText(t.levels[o.level ?? "intermediate"].title, { exact: true }).click();
  if (o.notes) await page.getByRole("textbox", { name: t.booking.notes }).fill(o.notes);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: t.booking.reviewBooking }).click();

  // 4. Review & confirm
  await expect(page.getByRole("heading", { name: t.booking.reviewTitle })).toBeVisible();
  await page.getByRole("button", { name: t.booking.confirm }).click();
  await expect(page).toHaveURL(/\/booking\/success\?ref=SSK-[A-Z0-9]{6}/, { timeout: 20_000 });
  const reference = new URL(page.url()).searchParams.get("ref") ?? "";
  return { reference, date, time };
}

/** The calendar day button's accessible name — same formatter as the calendar itself. */
export const dayLabel = (iso: string, lang: Lang) => formatDateLong(iso, lang);

/** Signs in to the demo dashboard (no password in demo mode). */
export async function adminSignIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByRole("button", { name: /Enter demo dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Opens a booking's detail page from the bookings list (search by reference). */
export async function openBooking(page: Page, search: string) {
  await page.goto(`/admin/bookings?q=${encodeURIComponent(search)}`);
  await page.locator('main a[href^="/admin/bookings/"]').first().click();
  await expect(page).toHaveURL(/\/admin\/bookings\/[^/?]+$/);
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}
