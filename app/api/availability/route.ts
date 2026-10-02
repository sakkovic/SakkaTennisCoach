import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { isBookingEnabled } from "@/lib/env";
import { addDays, firstOfMonth, lastOfMonth, nowInTimeZone } from "@/lib/booking/time";
import { availabilityQuerySchema } from "@/lib/validation/booking";

/**
 * GET /api/availability?service=<id>&location=<id>&month=YYYY-MM  → { dates: string[] }
 * GET /api/availability?service=<id>&location=<id>&date=YYYY-MM-DD → { slots: Slot[] }
 * Returns times only — never any booking or personal data.
 */
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!isBookingEnabled) return NextResponse.json({ error: "not_configured" }, { status: 503, headers });

  const parsed = availabilityQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success || (!parsed.data.date && !parsed.data.month)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400, headers });
  }

  const { service, location, date, month } = parsed.data;
  const repo = getRepository();

  try {
    if (date) {
      const slots = await repo.getAvailableSlots(service, location, date);
      return NextResponse.json({ slots }, { headers });
    }

    const settings = await repo.getSettings();
    const today = nowInTimeZone(settings.timezone).date;
    const lastBookable = addDays(today, settings.maxAdvanceDays);
    const from = [firstOfMonth(month!), today].sort().at(-1)!;
    const to = [lastOfMonth(month!), lastBookable].sort()[0];
    const dates = from > to ? [] : await repo.getAvailableDates(service, location, from, to);
    return NextResponse.json({ dates, today, lastBookable }, { headers });
  } catch (err) {
    unstable_rethrow(err); // let Next.js handle its own signals (dynamic rendering, redirects)
    console.error("[availability]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers });
  }
}
