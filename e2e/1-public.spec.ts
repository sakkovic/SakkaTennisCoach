import { expect, test } from "@playwright/test";
import { dict, prefix } from "./helpers";

const pages = ["/", "/coaching", "/about", "/journey", "/contact", "/privacy", "/booking"] as const;

test.describe("Public pages", () => {
  for (const lang of ["en", "fr"] as const) {
    for (const path of pages) {
      test(`${lang} ${path} renders without errors`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
        const res = await page.goto(`${prefix(lang)}${path === "/" ? "" : path}` || "/");
        expect(res?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("main")).not.toContainText(/\{[a-z]+\}/); // no unfilled {placeholders}
        expect(errors, errors.join("\n")).toEqual([]);
      });
    }
  }

  test("unknown pages show the 404 page in both languages", async ({ page }) => {
    expect((await page.goto("/does-not-exist"))?.status()).toBe(404);
    await expect(page.getByText(dict.en.notFound.title)).toBeVisible();
    expect((await page.goto("/fr/n-existe-pas"))?.status()).toBe(404);
    await expect(page.getByText(dict.fr.notFound.title)).toBeVisible();
  });

  test("/en/… redirects to the clean English address", async ({ page }) => {
    await page.goto("/en/coaching");
    await expect(page).toHaveURL(/\/coaching$/);
  });

  test("language switcher keeps the page and remembers the choice", async ({ page, context }) => {
    await page.goto("/coaching");
    await page.getByRole("button", { name: "Français" }).first().click();
    await expect(page).toHaveURL(/\/fr\/coaching$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("fr");
    await page.getByRole("button", { name: "English" }).first().click();
    await expect(page).toHaveURL(/\/coaching$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("French browsers are sent to /fr on their first visit", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "fr-FR", extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9" } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/fr$/);
    await ctx.close();
  });

  test("main navigation links work", async ({ page }) => {
    await page.goto("/");
    for (const [label, path] of [
      [dict.en.nav.coaching, "/coaching"],
      [dict.en.nav.about, "/about"],
      [dict.en.nav.journey, "/journey"],
      [dict.en.nav.contact, "/contact"],
    ] as const) {
      await page.getByRole("navigation", { name: dict.en.nav.main }).getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test("coaching page shows prices in $, packs and the booking/cancellation policy", async ({ page }) => {
    await page.goto("/coaching");
    await expect(page.getByText("$60").first()).toBeVisible();
    await expect(page.getByText(/10-Lesson Pack/).first()).toBeVisible();
    await expect(page.getByText(/\$540/).first()).toBeVisible(); // 10 × $54 (−10 %)
    const policy = page.locator("#policy");
    await expect(policy).toContainText("Online booking is open from 24 hours to 7 days before the lesson");
    await expect(policy).toContainText("Cancellations made less than 24 hours before the lesson are not refunded");
    await page.goto("/fr/coaching");
    await expect(page.getByText("540 $").first()).toBeVisible();
    await expect(page.locator("#policy")).toContainText("de 24 heures à 7 jours");
  });

  test("court name links to Google Maps", async ({ page }) => {
    await page.goto("/contact");
    const link = page.getByRole("link", { name: /Tennis Club Hammam Sousse/ }).first();
    await expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/ZFQmQ9ox8x2ovXM58");
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("WhatsApp and phone links use the coach's number", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator('a[href^="https://wa.me/21658093366"]').first()).toBeVisible();
    await expect(page.locator('a[href="tel:+21658093366"]').first()).toBeVisible();
  });

  test("journey page filters posts by type", async ({ page }) => {
    await page.goto("/journey");
    const cards = page.locator("main article");
    const all = await cards.count();
    expect(all).toBeGreaterThan(0);
    await page.getByRole("navigation", { name: dict.en.journey.filter }).getByRole("link", { name: dict.en.journey.achievements }).click();
    await expect(page).toHaveURL(/type=achievement/);
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(all);
    for (const badge of await cards.locator("span").filter({ hasText: /^(On court|News)$/ }).all()) await expect(badge).toBeHidden();
  });

  test("home carousel slides by itself and has working side arrows and dots", async ({ page }) => {
    await page.goto("/");
    const carousel = page.getByRole("region", { name: dict.en.home.journey.carousel });
    await carousel.scrollIntoViewIfNeeded();
    const track = carousel.locator("ul");
    await page.mouse.move(0, 0); // not hovering
    await expect.poll(() => track.evaluate((el) => el.scrollLeft), { timeout: 12_000 }).toBeGreaterThan(50);
    await carousel.getByRole("button", { name: /Go to post 1$/ }).click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(10);
    await carousel.getByRole("button", { name: dict.en.home.journey.next }).click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
    await carousel.getByRole("button", { name: dict.en.home.journey.previous }).click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(10);
  });

  test("contact form validates, then sends", async ({ page }) => {
    await page.goto("/contact");
    const t = dict.en;
    await page.getByRole("button", { name: t.contact.send }).click();
    await expect(page.getByText(t.validation.contactName)).toBeVisible();
    await expect(page.getByText(t.validation.emailRequired)).toBeVisible();
    await expect(page.getByText(t.validation.contactMessage)).toBeVisible();
    await page.getByLabel(t.contact.name).fill("E2E Contact");
    await page.getByLabel(t.contact.email).fill("not-an-email");
    await page.getByLabel(t.contact.message).fill("Hello coach, do you have lessons for juniors on Saturday?");
    await page.getByRole("button", { name: t.contact.send }).click();
    await expect(page.getByText(t.validation.emailInvalid)).toBeVisible();
    await page.getByLabel(t.contact.email).fill("e2e.contact@example.com");
    await page.getByRole("button", { name: t.contact.send }).click();
    await expect(page.getByRole("heading", { name: t.contact.sentTitle })).toBeVisible();
  });

  test("French contact form shows French errors", async ({ page }) => {
    await page.goto("/fr/contact");
    await page.getByRole("button", { name: dict.fr.contact.send }).click();
    await expect(page.getByText(dict.fr.validation.contactName)).toBeVisible();
  });

  test("security headers are sent", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("SEO: sitemap lists both languages, pages have canonical + hreflang", async ({ page, request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/fr/coaching");
    expect(sitemap.match(/<loc>/g)?.length).toBe(14);
    await page.goto("/fr/about");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fr\/about$/);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", /\/about$/);
    expect((await request.get("/robots.txt")).ok()).toBeTruthy();
  });

  test("admin pages are not reachable when signed out", async ({ page }) => {
    for (const path of ["/admin", "/admin/bookings", "/admin/settings", "/admin/emails", "/admin/calendar"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });
});
