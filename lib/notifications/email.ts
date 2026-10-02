import "server-only";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/booking/money";
import { formatDateLong, formatDuration } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";
import { getRepository } from "@/lib/data";
import { fill, getDictionary, localizePath, type Locale } from "@/lib/i18n";
import { localizeService } from "@/lib/i18n/localize";
import { recordEmail } from "./outbox";

/**
 * Transactional email via Resend's REST API (no SDK dependency).
 * Player emails are written in the player's language (booking.locale); coach
 * notifications are in English. Without RESEND_API_KEY nothing is sent: emails
 * are kept in the local outbox (Admin → Emails) so they can be checked before launch.
 * The booking flow never fails because of email.
 */

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? `${siteConfig.name} <bookings@example.com>`;
const coachInbox = process.env.COACH_NOTIFICATION_EMAIL ?? siteConfig.contact.email;

type Mail = { to: string; subject: string; html: string; replyTo?: string };

async function send(mail: Mail) {
  if (!apiKey) {
    recordEmail({ ...mail, delivered: false });
    console.info(`[email:outbox] to=${mail.to} subject="${mail.subject}" (preview in Admin → Emails; set RESEND_API_KEY to send)`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, reply_to: mail.replyTo }),
    });
    recordEmail({ ...mail, delivered: res.ok });
    if (!res.ok) console.error("[email] failed", res.status, await res.text());
  } catch (err) {
    console.error("[email] error", err);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(locale: Locale, title: string, body: string) {
  const t = getDictionary(locale);
  return `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f5f7f8;font-family:Inter,Arial,sans-serif;color:#071c2c">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
    <tr><td style="background:#071c2c;padding:28px 32px">
      <p style="margin:0;color:#d7f530;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700">${esc(t.meta.role)}</p>
      <p style="margin:6px 0 0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:1px">${esc(siteConfig.brand)}</p>
    </td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid #e3e8eb;color:#5b6b78;font-size:12px">
      ${esc(siteConfig.name)} · ${esc(siteConfig.contact.phoneDisplay)} · ${esc(siteConfig.contact.email)}<br>
      <a href="${siteConfig.location.mapsUrl}" style="color:#5b6b78">${esc(siteConfig.location.venue)}, ${esc(siteConfig.location.city)}</a>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

type Row = { label: string; value: string; href?: string | null };

function table(rows: Row[]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8eb;border-radius:14px;margin:8px 0 20px">
    ${rows
      .map(({ label, value, href }) => {
        const v = href ? `<a href="${esc(href)}" style="color:#071c2c;text-decoration:underline">${esc(value)} ↗</a>` : esc(value);
        return `<tr><td style="padding:10px 16px;color:#5b6b78;font-size:14px;border-bottom:1px solid #f0f3f4">${esc(label)}</td><td style="padding:10px 16px;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #f0f3f4">${v}</td></tr>`;
      })
      .join("")}
  </table>`;
}

/** Booking details in a language; service name translated and the court linked to Google Maps. */
async function details(b: Booking, locale: Locale) {
  const t = getDictionary(locale).email.rows;
  const repo = getRepository();
  const [services, locations] = await Promise.all([repo.listServices({ includeInactive: true }), repo.listLocations({ includeInactive: true })]);
  const service = services.find((s) => s.id === b.serviceId);
  const serviceName = service ? localizeService(service, locale).name : b.serviceName;
  const mapsUrl = locations.find((l) => l.id === b.locationId)?.mapsUrl ?? null;

  const rows: Row[] = [
    { label: t.reference, value: b.reference },
    { label: t.lesson, value: serviceName },
    { label: t.date, value: formatDateLong(b.date, locale) },
    { label: t.time, value: `${b.startTime} – ${b.endTime}` },
    { label: t.duration, value: formatDuration(b.durationMin) },
    { label: t.location, value: b.locationName, href: mapsUrl },
    { label: t.players, value: String(b.playersCount) },
    { label: t.price, value: formatPrice(b.priceCents, b.currency, locale) + (b.package ? ` ${t.perLesson}` : "") },
  ];
  if (b.package) {
    rows.push({ label: t.pack, value: fill(t.packValue, { name: b.package.name, n: b.package.lessons, d: b.package.discountPercent }) });
    if (b.package.totalCents !== null) rows.push({ label: t.packTotal, value: formatPrice(b.package.totalCents, b.currency, locale) });
  }
  return table(rows);
}

const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#23394a">${html}</p>`;

/** Cancellation rule, in a light box under the lesson details. */
function cancellationPolicy(locale: Locale, withPack = false) {
  const t = getDictionary(locale).policy;
  const text = fill(t.cancellation, { hours: siteConfig.policies.cancellationHours }) + (withPack ? ` ${t.packNote}` : "");
  return `<div style="margin:0 0 16px;padding:12px 14px;border-radius:10px;background:#f3f5f7;font-size:13px;line-height:1.55;color:#23394a"><strong>${esc(t.cancellationTitle)}</strong><br>${esc(text)}</div>`;
}

export async function sendBookingRequestEmails(b: Booking) {
  if (!b.email) return; // online bookings always have an email
  const locale = b.locale;
  const t = getDictionary(locale).email;
  await Promise.all([
    send({
      to: b.email,
      subject: fill(t.receivedSubject, { ref: b.reference }),
      replyTo: coachInbox,
      html: layout(
        locale,
        t.receivedTitle,
        p(esc(fill(t.hi, { name: b.firstName }))) + p(t.receivedText) + (await details(b, locale)) + cancellationPolicy(locale, b.package !== null) + p(t.changeText),
      ),
    }),
    send({
      to: coachInbox,
      subject: `New booking request: ${b.serviceName} — ${formatDateLong(b.date)} ${b.startTime}`,
      replyTo: b.email,
      html: layout(
        "en",
        "New booking request",
        p(`<strong>${esc(b.firstName)} ${esc(b.lastName)}</strong> (${esc(b.playerLevel)}) · ${esc(b.email)} · ${esc(b.phone ?? "")} · ${b.locale === "fr" ? "Français" : "English"}`) +
          (await details(b, "en")) +
          (b.notes ? p(`<em>“${esc(b.notes)}”</em>`) : "") +
          p(`<a href="${siteConfig.url}/admin/bookings/${b.id}" style="color:#071c2c;font-weight:700">Review in the dashboard →</a>`),
      ),
    }),
  ]);
}

export async function sendBookingStatusEmail(b: Booking) {
  if (!b.email) return; // lessons created by the coach may have no email
  const locale = b.locale;
  const t = getDictionary(locale).email;
  if (b.status === "confirmed") {
    await send({
      to: b.email,
      subject: fill(t.confirmedSubject, { date: formatDateLong(b.date, locale), time: b.startTime }),
      replyTo: coachInbox,
      html: layout(locale, t.confirmedTitle, p(esc(fill(t.hi, { name: b.firstName }))) + p(esc(t.confirmedText)) + (await details(b, locale)) + cancellationPolicy(locale, b.package !== null)),
    });
  } else if (b.status === "cancelled") {
    const bookingUrl = `${siteConfig.url}${localizePath(locale, "/booking")}`;
    await send({
      to: b.email,
      subject: fill(t.cancelledSubject, { ref: b.reference }),
      replyTo: coachInbox,
      html: layout(
        locale,
        t.cancelledTitle,
        p(esc(fill(t.hi, { name: b.firstName }))) +
          p(esc(t.cancelledText)) +
          (b.cancellationReason ? p(esc(fill(t.reason, { reason: b.cancellationReason }))) : "") +
          (await details(b, locale)) +
          p(`${esc(t.rebook)} <a href="${bookingUrl}">${esc(bookingUrl.replace(/^https?:\/\//, ""))}</a>.`),
      ),
    });
  }
}

/** Sent when the coach schedules one or more lessons for a player (optional). */
export async function sendLessonsScheduledEmail(input: {
  email: string;
  locale: Locale;
  firstName: string;
  serviceId: string;
  serviceName: string;
  locationName: string;
  mapsUrl: string | null;
  startTime: string;
  endTime: string;
  summary: string;
  dates: string[];
}) {
  const { locale } = input;
  const t = getDictionary(locale).email;
  const services = await getRepository().listServices({ includeInactive: true });
  const service = services.find((s) => s.id === input.serviceId);
  const serviceName = service ? localizeService(service, locale).name : input.serviceName;
  const place = input.mapsUrl ? `<a href="${esc(input.mapsUrl)}" style="color:#071c2c">${esc(input.locationName)} ↗</a>` : esc(input.locationName);
  const list = input.dates.map((d) => `<li style="margin:0 0 6px">${esc(formatDateLong(d, locale))} · ${esc(input.startTime)}–${esc(input.endTime)}</li>`).join("");
  const many = input.dates.length > 1;
  await send({
    to: input.email,
    subject: many ? fill(t.scheduledSubjectMany, { n: input.dates.length }) : fill(t.scheduledSubjectOne, { date: formatDateLong(input.dates[0], locale) }),
    replyTo: coachInbox,
    html: layout(
      locale,
      many ? t.scheduledTitleMany : t.scheduledTitleOne,
      p(esc(fill(t.hi, { name: input.firstName }))) +
        p(`${esc(serviceName)} — ${place}${locale === "en" ? ` · ${esc(input.summary)}` : ""}.`) +
        `<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;color:#23394a">${list}</ul>` +
        cancellationPolicy(locale) +
        p(esc(t.scheduledFooter)),
    ),
  });
}

export async function sendContactNotification(input: { name: string; email: string; phone: string | null; message: string }) {
  await send({
    to: coachInbox,
    subject: `New message from ${input.name}`,
    replyTo: input.email,
    html: layout(
      "en",
      "New contact message",
      p(`<strong>${esc(input.name)}</strong> · ${esc(input.email)}${input.phone ? ` · ${esc(input.phone)}` : ""}`) + p(esc(input.message).replace(/\n/g, "<br>")),
    ),
  });
}
