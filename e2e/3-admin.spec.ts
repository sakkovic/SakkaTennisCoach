import { expect, test, type Page } from "@playwright/test";
import { addDays, adminSignIn, availableDates, availableSlots, bookLesson, DEMO, dict, expectToast, openBooking, tunisToday } from "./helpers";

/**
 * Every coach-dashboard function, end to end. Each test signs in to the demo dashboard
 * (demo mode has no password) and creates the data it needs.
 */
test.describe.configure({ mode: "default" });

const status = (page: Page) => page.locator("main").getByText(/^(Pending|Confirmed|Cancelled|Completed)$/).first();

test.describe("Coach dashboard", () => {
  test("sign in, dashboard shows the new request, sign out", async ({ page }) => {
    await bookLesson(page, { service: /Private Tennis Lesson/, first: "Dash", last: "Board", email: "dash.board@example.com" });
    await adminSignIn(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Pending requests").first()).toBeVisible();
    await expect(page.locator("main")).toContainText("Dash Board");
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/bookings");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("approve, complete, undo, add notes — with the player's email in their language", async ({ page }) => {
    const booked = await bookLesson(page, { lang: "fr", service: /Cours de tennis particulier/, first: "Amel", last: "Approve", email: "amel.approve@example.com" });
    await adminSignIn(page);
    await openBooking(page, "Approve");
    await expect(page.getByRole("heading", { name: "Amel Approve" })).toBeVisible();
    await expect(page.getByText("Français")).toBeVisible();
    await expect(page.getByText(booked.reference)).toBeVisible();
    await expect(page.getByRole("link", { name: /Tennis Club Hammam Sousse/ }).first()).toHaveAttribute("href", /maps\.app\.goo\.gl/);
    await expect(status(page)).toHaveText("Pending");

    // Approve
    await page.getByRole("button", { name: /^Confirm booking for Amel Approve$/ }).click();
    await expectToast(page, "Booking confirmed");
    await expect(status(page)).toHaveText("Confirmed");

    // Notes are private and persist
    await page.getByPlaceholder("Private notes — only visible to you.").fill("Works on second serve. Prefers mornings.");
    await page.getByRole("button", { name: /Save notes/ }).click();
    await expectToast(page, "Notes saved.");
    await page.reload();
    await expect(page.getByPlaceholder("Private notes — only visible to you.")).toHaveValue("Works on second serve. Prefers mornings.");

    // Complete, then undo
    await page.getByRole("button", { name: /^Complete lesson with Amel Approve$/ }).click();
    await expectToast(page, "Lesson marked as completed.");
    await expect(status(page)).toHaveText("Completed");
    await page.getByRole("button", { name: "Undo completion" }).click();
    await expect(status(page)).toHaveText("Confirmed");

    // The player got "request received" then "confirmed", in French
    await page.goto("/admin/emails");
    await expect(page.getByText(`Demande de cours reçue — ${booked.reference}`)).toBeVisible();
    await expect(page.getByText(/^Cours confirmé — /).first()).toBeVisible();
    await expect(page.getByText(/New booking request: Private Tennis Lesson/).first()).toBeVisible(); // coach, English
  });

  test("cancel with a reason frees the slot; reopening takes it again", async ({ page, request }) => {
    const booked = await bookLesson(page, { service: /Private Tennis Lesson/, first: "Carl", last: "Cancel", email: "carl.cancel@example.com" });
    expect(await availableSlots(request, DEMO.privateLesson, booked.date)).not.toContain(booked.time);
    await adminSignIn(page);
    await openBooking(page, "Cancel");
    await page.getByRole("button", { name: /^Cancel booking for Carl Cancel$/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Cancel Carl Cancel's booking?");
    await dialog.getByRole("textbox").fill("Court maintenance on that day");
    await dialog.getByRole("button", { name: "Cancel booking" }).click();
    await expectToast(page, "Booking cancelled");
    await expect(status(page)).toHaveText("Cancelled");
    await expect(page.getByText("Court maintenance on that day")).toBeVisible();

    expect(await availableSlots(request, DEMO.privateLesson, booked.date)).toContain(booked.time); // free again

    await page.goto("/admin/emails");
    await page.getByRole("button", { name: new RegExp(`Lesson cancelled — ${booked.reference}`) }).click();
    await expect(page.frameLocator("iframe").getByText("Court maintenance on that day")).toBeVisible();
    await expect(page.frameLocator("iframe").getByText(/not refunded/)).toHaveCount(0); // cancellation email has no policy box

    await openBooking(page, "Cancel");
    await page.getByRole("button", { name: "Reopen as pending" }).click();
    await expect(status(page)).toHaveText("Pending");
    expect(await availableSlots(request, DEMO.privateLesson, booked.date)).not.toContain(booked.time); // held again
  });

  test("player emails include the cancellation policy and the map link", async ({ page }) => {
    const booked = await bookLesson(page, { service: /Private Tennis Lesson/, first: "Policy", last: "Mail", email: "policy.mail@example.com" });
    await adminSignIn(page);
    await page.goto("/admin/emails");
    await page.getByRole("button", { name: new RegExp(`Lesson request received — ${booked.reference}`) }).click();
    const mail = page.frameLocator("iframe");
    await expect(mail.getByText(/Cancellations made less than 24 hours before the lesson are not refunded/)).toBeVisible();
    await expect(mail.locator('a[href="https://maps.app.goo.gl/ZFQmQ9ox8x2ovXM58"]').first()).toBeVisible();
    await expect(mail.getByText(booked.reference).first()).toBeVisible();
  });

  test("bookings list: search and row opens the details", async ({ page }) => {
    await bookLesson(page, { service: /Private Tennis Lesson/, first: "Search", last: "Me", email: "search.me@example.com" });
    await adminSignIn(page);
    await page.goto("/admin/bookings?q=search.me@example.com");
    const rows = page.locator('main a[href^="/admin/bookings/"]').filter({ visible: true });
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Search Me");
    await page.goto("/admin/bookings?q=nobody-at-all");
    await expect(rows).toHaveCount(0);
  });

  test("coach creates a weekly lesson series, sees conflicts, and cancels the series", async ({ page }) => {
    await adminSignIn(page);
    // A Monday at least 9 days ahead (outside the public window — the coach can book any date)
    let first = addDays(tunisToday(), 9);
    while (new Date(`${first}T12:00:00Z`).getUTCDay() !== 1) first = addDays(first, 1);
    await page.goto(`/admin/calendar?new=${first}T10:00`);
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("heading", { name: "New lesson" })).toBeVisible();
    await dlg.getByRole("radio", { name: "Weekly" }).click();
    await dlg.getByLabel("Number of lessons").fill("3");
    await dlg.getByRole("textbox", { name: "First name", exact: true }).fill("Series");
    await dlg.getByRole("textbox", { name: "Last name", exact: true }).fill("Weekly");
    await dlg.locator("#nl-email").fill("series.weekly@example.com");
    await dlg.getByRole("checkbox", { name: "Email the schedule to the player" }).check(); // off by default
    await dlg.getByRole("button", { name: "Check availability" }).click();
    await expect(dlg.getByRole("heading", { name: "Review lessons" })).toBeVisible();
    await dlg.getByRole("button", { name: "Add 3 lessons" }).click();
    await expectToast(page, "3 lessons added to the calendar");

    await page.goto("/admin/bookings?q=series.weekly@example.com");
    await expect(page.locator('main a[href^="/admin/bookings/"]').filter({ visible: true })).toHaveCount(3);
    await expect(page.locator("main").getByLabel("Recurring lesson").first()).toBeVisible();

    // Same time again → every date is taken by the series
    await page.goto(`/admin/calendar?new=${first}T10:00`);
    await dlg.getByRole("radio", { name: "Weekly" }).click();
    await dlg.getByLabel("Number of lessons").fill("3");
    await dlg.getByRole("textbox", { name: "First name", exact: true }).fill("Clash");
    await dlg.getByRole("textbox", { name: "Last name", exact: true }).fill("Test");
    await dlg.getByRole("button", { name: "Check availability" }).click();
    await expect(dlg.getByRole("button", { name: "No free dates" })).toBeDisabled();
    await dlg.getByRole("button", { name: "Edit" }).click();
    await dlg.getByRole("button", { name: "Cancel" }).click();

    // Scheduled email to the player (French by default)
    await page.goto("/admin/emails");
    await expect(page.getByText("Vos 3 cours de tennis sont planifiés").first()).toBeVisible();

    // Cancel the whole series
    await openBooking(page, "series.weekly@example.com");
    await page.getByRole("button", { name: /Cancel all upcoming \(3\)/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel series" }).click();
    await expectToast(page, /3 upcoming lessons/);
    await page.goto("/admin/bookings?q=series.weekly@example.com&status=cancelled");
    await expect(page.locator("main")).toContainText("Cancelled");
  });

  test("calendar grid: clicking an empty slot opens the new-lesson form for that time", async ({ page }) => {
    await adminSignIn(page);
    await page.goto("/admin/calendar");
    const cell = page.locator('main a[href*="/admin/calendar?"][href*="new="]').nth(5);
    const href = (await cell.getAttribute("href")) ?? "";
    await cell.click();
    const when = decodeURIComponent(new URL(href, "http://x").searchParams.get("new") ?? "");
    await expect(page.getByRole("dialog").getByRole("heading", { name: "New lesson" })).toBeVisible();
    if (when.includes("T")) await expect(page.getByRole("dialog").getByLabel("Start time")).toHaveValue(when.split("T")[1]);
  });

  test("price change appears on the website, then is restored", async ({ page }) => {
    await adminSignIn(page);
    await page.goto("/admin/services");
    const toggle = page.getByRole("button", { name: /Private Tennis Lesson/ }).first();
    await toggle.click();
    const form = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
    await form.getByRole("textbox", { name: "Price", exact: true }).fill("65");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /saved|updated/i);
    await page.goto("/coaching");
    await expect(page.getByText("$65").first()).toBeVisible();

    await page.goto("/admin/services");
    await page.getByRole("button", { name: /Private Tennis Lesson/ }).first().click();
    await form.getByRole("textbox", { name: "Price", exact: true }).fill("60");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /saved|updated/i);
    await page.goto("/coaching");
    await expect(page.getByText("$60").first()).toBeVisible();
  });

  test("hiding a lesson type removes it from the website and booking", async ({ page }) => {
    await adminSignIn(page);
    await page.goto("/admin/services");
    const toggle = page.getByRole("button", { name: /Padel Coaching/ }).first();
    await toggle.click();
    const form = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
    await form.getByRole("checkbox", { name: "Visible on website" }).uncheck();
    await form.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /saved|updated/i);
    await page.goto("/booking");
    await expect(page.getByRole("radio", { name: /Padel Coaching/ })).toHaveCount(0);
    await page.goto("/coaching");
    await expect(page.locator("main").getByRole("heading", { name: "Padel Coaching" })).toHaveCount(0);

    await page.goto("/admin/services");
    await page.getByRole("button", { name: /Padel Coaching/ }).first().click();
    await form.getByRole("checkbox", { name: "Visible on website" }).check();
    await form.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /saved|updated/i);
    await page.goto("/booking");
    await expect(page.getByRole("radio", { name: /Padel Coaching/ })).toHaveCount(1);
  });

  test("pack discount change is used in the booking prices", async ({ page }) => {
    await adminSignIn(page);
    await page.goto("/admin/services");
    const toggle = page.getByRole("button", { name: /10-Lesson Pack/ }).first();
    await toggle.click();
    const form = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
    await form.getByRole("spinbutton", { name: "Discount (%)" }).or(form.getByRole("textbox", { name: "Discount (%)" })).fill("15");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /saved|updated/i);
    await page.goto("/booking");
    await page.getByRole("radio", { name: /Private Tennis Lesson/ }).click();
    await expect(page.getByRole("radio", { name: /10-Lesson Pack/ })).toContainText("$510"); // 10 × $51

    await page.goto("/admin/services");
    await page.getByRole("button", { name: /10-Lesson Pack/ }).first().click();
    await form.getByRole("spinbutton", { name: "Discount (%)" }).or(form.getByRole("textbox", { name: "Discount (%)" })).fill("10");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /saved|updated/i);
  });

  test("blocking a day removes it from the booking calendar; unblocking restores it", async ({ page, request }) => {
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const day = dates.at(-1)!;
    await adminSignIn(page);
    await page.goto("/admin/availability");
    await page.locator("#block-from").fill(day);
    await page.locator("#block-to").fill(day);
    await page.locator("#block-reason").fill("E2E tournament");
    await page.getByRole("button", { name: "Block dates" }).click();
    await expectToast(page, "Dates blocked");
    expect((await availableDates(request, DEMO.privateLesson)).dates).not.toContain(day);

    await page.getByRole("button", { name: `Remove block from ${day}` }).click();
    await expectToast(page, "Block removed.");
    expect((await availableDates(request, DEMO.privateLesson)).dates).toContain(day);
  });

  test("weekly hours: pausing a day's hours closes it for booking", async ({ page, request }) => {
    const { dates } = await availableDates(request, DEMO.privateLesson);
    const day = dates.find((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 6) ?? dates[0]; // prefer Saturday (one window)
    const weekday = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    await adminSignIn(page);
    await page.goto("/admin/availability");
    const windows = page.getByRole("button", { name: new RegExp(`^Remove ${weekday} `) });
    const count = await windows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await windows.nth(i).locator("xpath=ancestor::li[1]").getByRole("button", { name: "Pause" }).click();
      await expect(windows.nth(i).locator("xpath=ancestor::li[1]").getByRole("button", { name: "Activate" })).toBeVisible();
    }
    expect((await availableDates(request, DEMO.privateLesson)).dates).not.toContain(day);
    for (let i = 0; i < count; i++) {
      await windows.nth(i).locator("xpath=ancestor::li[1]").getByRole("button", { name: "Activate" }).click();
      await expect(windows.nth(i).locator("xpath=ancestor::li[1]").getByRole("button", { name: "Pause" })).toBeVisible();
    }
    expect((await availableDates(request, DEMO.privateLesson)).dates).toContain(day);
  });

  test("weekly hours: add and remove an extra window", async ({ page, request }) => {
    await adminSignIn(page);
    await page.goto("/admin/availability");
    const sunday = page.locator("main").getByText("Sunday", { exact: true }).locator("xpath=ancestor::*[.//button][1]");
    await sunday.getByRole("button", { name: "Add hours" }).click();
    const form = page.locator("main form").filter({ has: page.getByRole("button", { name: "Add", exact: true }) });
    const [from, to] = await form.locator('input[type="time"]').all();
    await from.fill("10:00");
    await to.fill("12:00");
    await form.getByRole("button", { name: "Add", exact: true }).click();
    await expectToast(page, "Hours added for Sunday.");
    const { dates } = await availableDates(request, DEMO.privateLesson);
    expect(dates.some((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 0)).toBeTruthy();
    await page.getByRole("button", { name: "Remove Sunday 10:00–12:00" }).click();
    await expectToast(page, "Window removed.");
  });

  test("booking window setting (24 h / 7 days) is applied immediately", async ({ page, request }) => {
    await adminSignIn(page);
    await page.goto("/admin/settings");
    const window = page.getByRole("spinbutton", { name: "Booking window (days)" }).or(page.getByRole("textbox", { name: "Booking window (days)" }));
    await expect(window).toHaveValue("7");
    await expect(page.getByRole("spinbutton", { name: "Minimum notice (hours)" }).or(page.getByRole("textbox", { name: "Minimum notice (hours)" }))).toHaveValue("24");
    await window.fill("14");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expectToast(page, "Settings saved.");
    expect((await availableDates(request, DEMO.privateLesson)).lastBookable).toBe(addDays(tunisToday(), 14));
    await window.fill("7");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expectToast(page, "Settings saved.");
    expect((await availableDates(request, DEMO.privateLesson)).lastBookable).toBe(addDays(tunisToday(), 7));
  });

  test("journey: publish a post (with photo upload) and delete it", async ({ page }) => {
    await adminSignIn(page);
    await page.goto("/admin/journey");
    await page.getByRole("button", { name: "New post" }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("radio", { name: /Achievement/ }).click();
    // 1×1 PNG
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await dlg.locator('input[type="file"]').setInputFiles({ name: "trophy.png", mimeType: "image/png", buffer: png });
    await expectToast(page, "Photo uploaded.");
    await dlg.getByRole("textbox", { name: "Title", exact: true }).fill("E2E Club champion");
    await dlg.getByText("Version française").click();
    await dlg.getByRole("textbox", { name: "Titre (FR)" }).fill("E2E Champion du club");
    await dlg.getByRole("button", { name: "Publish" }).click();
    await page.goto("/journey");
    await expect(page.getByRole("heading", { name: "E2E Club champion" })).toBeVisible();
    await page.goto("/fr/journey");
    await expect(page.getByRole("heading", { name: "E2E Champion du club" })).toBeVisible();

    await page.goto("/admin/journey");
    await page.getByRole("button", { name: /E2E Club champion/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete post" }).last().click();
    await expectToast(page, "Post deleted.");
    await page.goto("/journey");
    await expect(page.getByRole("heading", { name: "E2E Club champion" })).toHaveCount(0);
  });

  test("contact messages: read, archive, restore", async ({ page }) => {
    await page.goto("/contact");
    const t = dict.en.contact;
    await page.getByLabel(t.name).fill("Mia Message");
    await page.getByRole("textbox", { name: t.email, exact: true }).fill("mia.message@example.com");
    await page.getByLabel(t.message).fill("Do you coach adults on weekday evenings?");
    await page.getByRole("button", { name: t.send }).click();
    await expect(page.getByRole("heading", { name: t.sentTitle })).toBeVisible();

    await adminSignIn(page);
    await page.goto("/admin/messages");
    const card = page.locator("main li, main article").filter({ hasText: "Mia Message" }).first();
    await expect(card).toContainText("Do you coach adults on weekday evenings?");
    await card.getByRole("button", { name: "Mark as read" }).click();
    await expect(card.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
    await card.getByRole("button", { name: "Archive" }).click();
    await card.getByRole("button", { name: "Restore" }).click();
    await expect(card.getByRole("button", { name: "Archive" })).toBeVisible();

    await page.goto("/admin/emails");
    await expect(page.getByText(/Mia Message/).first()).toBeVisible(); // coach was notified
  });
});
