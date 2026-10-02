import { expect, test } from "@playwright/test";
import { addDays, availableDates, availableSlots, bookLesson, DEMO, dict, tunisToday } from "./helpers";

/**
 * Client booking rules. Bookings made here are used by the admin tests (3-admin):
 *   "E2E Single" (EN, private lesson), "E2E Pack" (FR, 10-lesson pack), "E2E Duo" (semi-private, 2 players)
 */
test.describe.configure({ mode: "serial" });

test.describe("Booking window (24 h → 7 days)", () => {
  test("only dates from tomorrow to +7 days are bookable", async ({ request }) => {
    const { dates, lastBookable, today } = await availableDates(request, DEMO.privateLesson);
    expect(dates.length).toBeGreaterThan(0);
    expect(lastBookable).toBe(addDays(today, 7));
    for (const d of dates) {
      expect(d > today, `${d} must be after today`).toBeTruthy();
      expect(d <= lastBookable, `${d} must be within 7 days`).toBeTruthy();
    }
  });

  test("no slot starts less than 24 hours from now", async ({ request }) => {
    const tomorrow = addDays(tunisToday(), 1);
    const slots = await availableSlots(request, DEMO.privateLesson, tomorrow);
    const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", hour12: false });
    for (const s of slots) expect(s >= now, `${tomorrow} ${s} is less than 24 h away (now ${now})`).toBeTruthy();
    expect(await availableSlots(request, DEMO.privateLesson, tunisToday())).toEqual([]);
    expect(await availableSlots(request, DEMO.privateLesson, addDays(tunisToday(), 8))).toEqual([]);
    expect(await availableSlots(request, DEMO.privateLesson, addDays(tunisToday(), -1))).toEqual([]);
  });

  test("calendar greys out dates outside the window and explains how to book them", async ({ page, request }) => {
    const { lastBookable } = await availableDates(request, DEMO.privateLesson);
    await page.goto("/booking?service=private-lesson&step=datetime");
    await expect(page.getByText(/Online booking is open from 24 hours to 7 days before the lesson/)).toBeVisible();
    await expect(page.getByRole("link", { name: dict.en.policy.contactCoach })).toHaveAttribute("href", /wa\.me\/21658093366/);
    const after = addDays(lastBookable, 1);
    if (after.slice(0, 7) === lastBookable.slice(0, 7)) {
      const day = page.locator("button[aria-label$='unavailable']").filter({ hasText: new RegExp(`^${Number(after.slice(8))}$`) });
      await expect(day.first()).toBeDisabled();
    }
  });
});

test.describe("Booking form", () => {
  test("shows clear errors for missing and invalid details (EN)", async ({ page, request }) => {
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const slot = (await availableSlots(request, DEMO.privateLesson, dates[0]))[0];
    await page.goto(`/booking?service=private-lesson&date=${dates[0]}&time=${slot}&step=details`);
    const t = dict.en;
    await page.getByRole("button", { name: t.booking.reviewBooking }).click();
    for (const msg of [t.validation.firstName, t.validation.lastName, t.validation.emailRequired, t.validation.phoneRequired, t.validation.level, t.validation.consent]) {
      await expect(page.getByText(msg)).toBeVisible();
    }
    await page.getByRole("textbox", { name: t.booking.email, exact: true }).fill("bad@");
    await page.getByRole("textbox", { name: t.booking.phone, exact: true }).fill("12");
    await page.getByRole("button", { name: t.booking.reviewBooking }).click();
    await expect(page.getByText(t.validation.emailInvalid)).toBeVisible();
    await expect(page.getByText(t.validation.phoneInvalid)).toBeVisible();
  });

  test("shows the errors in French on /fr", async ({ page, request }) => {
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const slot = (await availableSlots(request, DEMO.privateLesson, dates[0]))[0];
    await page.goto(`/fr/booking?service=private-lesson&date=${dates[0]}&time=${slot}&step=details`);
    await page.getByRole("button", { name: dict.fr.booking.reviewBooking }).click();
    await expect(page.getByText(dict.fr.validation.firstName)).toBeVisible();
    await expect(page.getByText(dict.fr.validation.consent)).toBeVisible();
  });

  test("keeps what the player typed after a page refresh", async ({ page, request }) => {
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const slot = (await availableSlots(request, DEMO.privateLesson, dates[0]))[0];
    await page.goto(`/booking?service=private-lesson&date=${dates[0]}&time=${slot}&step=details`);
    await page.getByRole("textbox", { name: dict.en.booking.firstName, exact: true }).fill("Draft");
    await page.getByRole("textbox", { name: dict.en.booking.email, exact: true }).fill("draft@example.com");
    await page.reload();
    await expect(page.getByRole("textbox", { name: dict.en.booking.firstName, exact: true })).toHaveValue("Draft");
    await expect(page.getByRole("textbox", { name: dict.en.booking.email, exact: true })).toHaveValue("draft@example.com");
  });
});

test.describe("Making bookings", () => {
  test("single private lesson (EN): summary, policy, success page", async ({ page, request }) => {
    const booked = await bookLesson(page, {
      service: /Private Tennis Lesson/,
      first: "E2E",
      last: "Single",
      email: "e2e.single@example.com",
      level: "beginner",
      notes: "Working on my backhand",
    });
    const t = dict.en.booking.success;
    await expect(page.getByRole("heading", { name: t.title })).toBeVisible();
    await expect(page.getByText(booked.reference)).toBeVisible();
    await expect(page.getByText(t.awaiting)).toBeVisible();
    await expect(page.getByText("$60").first()).toBeVisible();
    await expect(page.getByText(/not refunded/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Tennis Club Hammam Sousse/ }).first()).toHaveAttribute("href", /maps\.app\.goo\.gl/);

    // The slot is now taken: it disappears from availability
    expect(await availableSlots(request, DEMO.privateLesson, booked.date)).not.toContain(booked.time);
    test.info().annotations.push({ type: "booking", description: `${booked.reference} ${booked.date} ${booked.time}` });
  });

  test("the same slot cannot be booked twice", async ({ page, request }) => {
    // Find the slot E2E Single took: book it again through a hand-made URL
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const first = await bookLesson(page, { service: /Private Tennis Lesson/, first: "E2E", last: "Race", email: "e2e.race1@example.com", date: dates[0] });
    const t = dict.en;
    await page.goto(`/booking?service=private-lesson&date=${first.date}&time=${first.time}&step=details`);
    await page.getByRole("textbox", { name: t.booking.firstName, exact: true }).fill("Second");
    await page.getByRole("textbox", { name: t.booking.lastName, exact: true }).fill("Player");
    await page.getByRole("textbox", { name: t.booking.email, exact: true }).fill("e2e.race2@example.com");
    await page.getByRole("textbox", { name: t.booking.phone, exact: true }).fill("+216 20 222 333");
    await page.getByText(t.levels.advanced.title, { exact: true }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: t.booking.reviewBooking }).click();
    await page.getByRole("button", { name: t.booking.confirm }).click();
    await expect(page.getByText(t.booking.errors.slot_unavailable)).toBeVisible();
    await expect(page).not.toHaveURL(/success/);
    await expect(page).toHaveURL(/step=datetime/); // sent back to pick another time
  });

  test("10-lesson pack (FR): −10 % pricing in the summary and on the success page", async ({ page }) => {
    await page.goto("/fr/booking");
    await page.getByRole("radio", { name: /Cours de tennis particulier/ }).click();
    const pack = page.getByRole("radio", { name: /Forfait 10 cours/ });
    await expect(pack).toContainText("54 $");
    await expect(pack).toContainText("540 $");
    const booked = await bookLesson(page, {
      lang: "fr",
      service: /Cours de tennis particulier/,
      pack: /Forfait 10 cours/,
      first: "E2E",
      last: "Pack",
      email: "e2e.pack@example.com",
      level: "advanced",
    });
    await expect(page.getByRole("heading", { name: dict.fr.booking.success.title })).toBeVisible();
    await expect(page.getByText("Forfait 10 cours")).toBeVisible();
    await expect(page.getByText("540 $")).toBeVisible();
    await expect(page.getByText(/10 cours × 54\s\$/)).toBeVisible(); // French puts a narrow no-break space before "$"
    expect(booked.reference).toMatch(/^SSK-/);
  });

  test("semi-private lesson for 2 players is priced per player ($40 × 2)", async ({ page }) => {
    await bookLesson(page, { service: /Semi-Private Lesson/, first: "E2E", last: "Duo", email: "e2e.duo@example.com", level: "intermediate" });
    await expect(page.getByText("$80").first()).toBeVisible();
    await expect(page.getByText(/^2$/).first()).toBeVisible();
  });

  test("anti-spam: too many pending requests from one email are refused", async ({ page, request }) => {
    const email = "e2e.spam@example.com";
    for (let i = 0; i < 3; i++) await bookLesson(page, { service: /Private Tennis Lesson/, first: "Spam", last: `N${i}`, email });
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const slot = (await availableSlots(request, DEMO.privateLesson, dates.at(-1)!))[0];
    const t = dict.en;
    await page.goto(`/booking?service=private-lesson&date=${dates.at(-1)}&time=${slot}&step=details`);
    await page.getByRole("textbox", { name: t.booking.firstName, exact: true }).fill("Spam");
    await page.getByRole("textbox", { name: t.booking.lastName, exact: true }).fill("N4");
    await page.getByRole("textbox", { name: t.booking.email, exact: true }).fill(email);
    await page.getByRole("textbox", { name: t.booking.phone, exact: true }).fill("+216 20 999 999");
    await page.getByText(t.levels.beginner.title, { exact: true }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: t.booking.reviewBooking }).click();
    await page.getByRole("button", { name: t.booking.confirm }).click();
    await expect(page.getByText(t.booking.errors.rate_limited)).toBeVisible();
  });

  test("an unknown booking reference shows the 404 page", async ({ page }) => {
    expect((await page.goto("/booking/success?ref=SSK-ZZZZZZ"))?.status()).toBe(404);
    expect((await page.goto("/booking/success?ref=<script>"))?.status()).toBe(404);
  });
});
