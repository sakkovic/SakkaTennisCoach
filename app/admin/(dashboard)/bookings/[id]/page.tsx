import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarPlus, Clock, Mail, MapPin, MessageSquareText, Phone, Repeat, Timer, Users } from "lucide-react";
import { AdminCard } from "@/components/admin/AdminPageHeader";
import { BookingActions } from "@/components/admin/BookingActions";
import { BookingNotesForm } from "@/components/admin/BookingNotesForm";
import { SeriesActions } from "@/components/admin/SeriesActions";
import { StatusBadge, statusLabel } from "@/components/admin/StatusBadge";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { MapLink } from "@/components/ui/MapLink";
import { en } from "@/lib/i18n/dictionaries/en";
import { coachToday } from "@/lib/admin/today";
import { getRepository } from "@/lib/data";
import { formatPrice } from "@/lib/booking/money";
import { formatDateLong, formatDateShort, formatDuration } from "@/lib/booking/time";

export const metadata = { title: "Booking details" };

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  const repo = getRepository();
  const [booking, events, locations] = await Promise.all([repo.getBooking(id), repo.getBookingEvents(id), repo.listLocations({ includeInactive: true })]);
  if (!booking) notFound();
  const mapsUrl = locations.find((l) => l.id === booking.locationId)?.mapsUrl ?? null;

  const fullName = `${booking.firstName} ${booking.lastName}`;
  const level = en.levels[booking.playerLevel]?.title ?? booking.playerLevel;
  const phoneDigits = booking.phone?.replace(/[^\d]/g, "") ?? "";

  const { today } = await coachToday();
  const seriesLessons = booking.seriesId ? await repo.listBookings({ today, scope: "all", seriesId: booking.seriesId }) : [];
  const upcomingInSeries = seriesLessons.filter((s) => s.date >= today && (s.status === "pending" || s.status === "confirmed")).length;

  const facts = [
    { icon: CalendarDays, label: "Date", value: formatDateLong(booking.date) },
    { icon: Clock, label: "Time", value: `${booking.startTime} – ${booking.endTime}` },
    { icon: Timer, label: "Duration", value: formatDuration(booking.durationMin) },
    { icon: MapPin, label: "Location", value: <MapLink name={booking.locationName} mapsUrl={mapsUrl} /> },
    { icon: Users, label: "Players", value: String(booking.playersCount) },
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> All bookings
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="tabular text-sm font-semibold text-muted">{booking.reference}</p>
          <h1 className="font-display mt-1 text-4xl leading-none md:text-5xl">{fullName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-line">{level}</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-line">{booking.locale === "fr" ? "Français" : "English"}</span>
            {booking.source === "admin" && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">Added by coach</span>}
            {booking.seriesId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-sky/40">
                <Repeat aria-hidden className="size-3.5" /> Recurring
              </span>
            )}
          </div>
        </div>
        <BookingActions id={booking.id} status={booking.status} playerName={fullName} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AdminCard title={booking.serviceName}>
            <dl className="grid gap-5 p-5 sm:grid-cols-2 md:p-6">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                    <dd className="tabular mt-0.5 font-semibold">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <div className="flex items-baseline justify-between border-t border-line px-5 py-4 md:px-6">
              <span className="text-sm text-muted">
                Price · payment <span className="font-medium text-ink">{booking.paymentStatus.replace("_", " ")}</span>
              </span>
              <span className="tabular text-2xl font-bold">
                {formatPrice(booking.priceCents, booking.currency)}
                {booking.package && <span className="ml-1 text-sm font-medium text-muted">/ lesson</span>}
              </span>
            </div>
          </AdminCard>

          {booking.package && (
            <AdminCard
              title={`Lesson pack · ${booking.package.name}`}
              description={
                booking.package.totalCents !== null
                  ? `Requested online with this first lesson.`
                  : `Part of the player's pack.`
              }
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                <dl className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Lessons</dt>
                    <dd className="font-display mt-0.5 text-3xl leading-none">{booking.package.lessons}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Discount</dt>
                    <dd className="font-display mt-0.5 text-3xl leading-none text-success">−{booking.package.discountPercent}%</dd>
                  </div>
                  {booking.package.totalCents !== null && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Pack total</dt>
                      <dd className="font-display tabular mt-0.5 text-3xl leading-none">{formatPrice(booking.package.totalCents, booking.currency)}</dd>
                    </div>
                  )}
                </dl>
                {booking.package.totalCents !== null && booking.package.lessons > 1 && booking.status !== "cancelled" && (
                  <ButtonLink href={`/admin/calendar?from=${booking.id}`} variant="secondary" icon={<CalendarPlus aria-hidden className="size-4" />} className="shrink-0">
                    Schedule remaining {booking.package.lessons - 1}
                  </ButtonLink>
                )}
              </div>
            </AdminCard>
          )}

          {booking.notes && (
            <AdminCard title="Player's message">
              <p className="flex gap-3 p-5 leading-relaxed md:p-6">
                <MessageSquareText aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
                {booking.notes}
              </p>
            </AdminCard>
          )}

          {booking.cancellationReason && (
            <AdminCard title="Cancellation reason">
              <p className="p-5 md:p-6">{booking.cancellationReason}</p>
            </AdminCard>
          )}

          <AdminCard title="Private notes">
            <div className="p-5 md:p-6">
              <BookingNotesForm id={booking.id} initial={booking.adminNotes} />
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Contact player">
            {!booking.phone && !booking.email ? (
              <p className="p-5 text-sm text-muted md:p-6">No contact details saved for this lesson.</p>
            ) : (
              <ul className="space-y-1 p-3">
                {booking.phone && (
                  <>
                    <li>
                      <a href={`tel:${booking.phone}`} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-surface">
                        <Phone aria-hidden className="size-5 text-muted" /> <span className="tabular">{booking.phone}</span>
                      </a>
                    </li>
                    <li>
                      <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-surface">
                        <WhatsAppIcon className="size-5 text-muted" /> WhatsApp
                      </a>
                    </li>
                  </>
                )}
                {booking.email && (
                  <li>
                    <a href={`mailto:${booking.email}?subject=${encodeURIComponent(`Your lesson — ${booking.reference}`)}`} className="flex items-center gap-3 break-all rounded-xl px-3 py-3 hover:bg-surface">
                      <Mail aria-hidden className="size-5 shrink-0 text-muted" /> {booking.email}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </AdminCard>

          {booking.seriesId && (
            <AdminCard title="Recurring lessons" description={`${seriesLessons.length} lesson${seriesLessons.length === 1 ? "" : "s"} in this series`}>
              <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {seriesLessons.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/bookings/${s.id}`}
                      aria-current={s.id === booking.id ? "page" : undefined}
                      className={`flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-surface ${s.id === booking.id ? "bg-lime/15 font-semibold" : ""}`}
                    >
                      <span className={`tabular ${s.status === "cancelled" ? "text-muted line-through" : ""}`}>
                        {formatDateShort(s.date)} · {s.startTime}
                      </span>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-3 py-3">
                <SeriesActions seriesId={booking.seriesId} upcoming={upcomingInSeries} />
              </div>
            </AdminCard>
          )}

          <AdminCard title="History">
            <ol className="space-y-4 p-5 md:p-6">
              {events.length === 0 && <li className="text-sm text-muted">No history yet.</li>}
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-lime-ink" />
                  <div>
                    <p className="font-medium">{e.fromStatus ? `${statusLabel(e.fromStatus)} → ${statusLabel(e.toStatus)}` : `Created as ${statusLabel(e.toStatus).toLowerCase()}`}</p>
                    <p className="text-xs text-muted">{dateTime(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
