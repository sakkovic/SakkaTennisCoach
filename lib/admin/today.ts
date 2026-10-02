import "server-only";
import { getRepository } from "@/lib/data";
import { nowInTimeZone } from "@/lib/booking/time";

/** "Today" in the coach's timezone (from settings). */
export async function coachToday() {
  const settings = await getRepository().getSettings();
  return { today: nowInTimeZone(settings.timezone).date, settings };
}
