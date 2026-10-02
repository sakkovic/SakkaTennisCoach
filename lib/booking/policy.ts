import { siteConfig } from "@/config/site";
import type { CoachSettings } from "@/lib/booking/types";
import { fill } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/config-types";

export type BookingWindow = Pick<CoachSettings, "minNoticeHours" | "maxAdvanceDays">;

/** Cancellation + booking-window sentences in the visitor's language. */
export function policyText(t: Dictionary, window: BookingWindow) {
  const hours = siteConfig.policies.cancellationHours;
  return {
    cancellation: fill(t.policy.cancellation, { hours }),
    packNote: t.policy.packNote,
    window: fill(t.policy.window, { notice: fill(t.policy.hours, { n: window.minNoticeHours }), days: window.maxAdvanceDays }),
  };
}
