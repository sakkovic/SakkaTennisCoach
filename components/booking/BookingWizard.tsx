"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createBookingAction } from "@/actions/booking";
import { useI18n } from "@/components/i18n/I18nProvider";
import { fill, localizePath } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/booking/money";
import { isValidISODate } from "@/lib/booking/time";
import { packagesFor, packPricing } from "@/lib/booking/packages";
import type { BookingWindow } from "@/lib/booking/policy";
import type { Location, Package, Service } from "@/lib/booking/types";
import { playerDetailsSchema, type PlayerDetails, type PlayerDetailsInput } from "@/lib/validation/booking";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils/cn";
import { BookingCalendar } from "./BookingCalendar";
import { BookingWindowNote } from "./BookingPolicy";
import { BookingSummary, totalPrice } from "./BookingSummary";
import { LocationSelector } from "./LocationSelector";
import { PlanSelector } from "./PlanSelector";
import { PLAYER_FORM_ID, PlayerForm } from "./PlayerForm";
import { ReviewStep } from "./ReviewStep";
import { ServiceSelector } from "./ServiceSelector";
import { StepHeading } from "./StepHeading";
import { StepIndicator } from "./StepIndicator";
import { isStepId, stepIndex, type StepId } from "./steps";
import { TimeSlotSelector } from "./TimeSlotSelector";

type Props = {
  services: Service[];
  locations: Location[];
  packages: Package[];
  today: string;
  lastBookable: string;
  bookingWindow: BookingWindow;
};

/**
 * Player details are kept as a draft in sessionStorage (never in the URL) so a
 * refresh or back navigation doesn't lose what the player typed.
 */
const DRAFT_KEY = "ssk-booking-draft";
const noopSubscribe = () => () => {};

function readDraftRaw(): string {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? "{}";
  } catch {
    return "{}"; // storage unavailable (private mode) — the draft is a convenience only
  }
}

function parseDraft(raw: string): Partial<PlayerDetailsInput> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeDraft(values: Partial<PlayerDetailsInput>) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function BookingWizard({ services, locations, packages, today, lastBookable, bookingWindow }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const b = t.booking;
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [submittedDetails, setSubmittedDetails] = useState<PlayerDetails | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // null during SSR/hydration, then the stored draft
  const draftRaw = useSyncExternalStore(noopSubscribe, readDraftRaw, () => null);
  const draft = useMemo(() => (draftRaw === null ? null : parseDraft(draftRaw)), [draftRaw]);
  const restoredDetails = useMemo(() => {
    const parsed = draft ? playerDetailsSchema.safeParse(draft) : null;
    return parsed?.success ? parsed.data : null;
  }, [draft]);

  // ---- Derive selection from the URL (deep-linkable, back button friendly) ----
  const service = services.find((s) => s.slug === params.get("service")) ?? null;
  const eligibleLocations = useMemo(
    () => (service ? locations.filter((l) => service.locationIds.length === 0 || service.locationIds.includes(l.id)) : []),
    [service, locations],
  );
  const location =
    eligibleLocations.find((l) => l.slug === params.get("location")) ?? (eligibleLocations.length === 1 ? eligibleLocations[0] : null);
  const dateParam = params.get("date");
  const date = dateParam && isValidISODate(dateParam) && dateParam >= today && dateParam <= lastBookable ? dateParam : null;
  const timeParam = params.get("time");
  const time = date && timeParam && /^\d{2}:\d{2}$/.test(timeParam) ? timeParam : null;

  const servicePackages = useMemo(() => (service ? packagesFor(packages, service) : []), [service, packages]);
  const pack = servicePackages.find((p) => p.id === params.get("pack")) ?? null;

  const candidate = submittedDetails ?? restoredDetails;
  const details = candidate && service && candidate.playersCount >= service.minPlayers && candidate.playersCount <= service.maxPlayers ? candidate : null;

  const firstIncomplete: StepId = !service ? "lesson" : !location ? "location" : !date || !time ? "datetime" : !details ? "details" : "review";
  const requested = params.get("step");
  // Never show a step whose prerequisites are missing (e.g. a stale or hand-edited URL).
  const step: StepId = isStepId(requested) && stepIndex(requested) <= stepIndex(firstIncomplete) ? requested : firstIncomplete;
  const playersCount = details?.playersCount ?? (typeof draft?.playersCount === "number" ? draft.playersCount : (service?.minPlayers ?? 1));

  // ---- Move focus to the step on change (keyboard & screen reader users) ----
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    stepRef.current?.focus({ preventScroll: true });
    stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const navigate = useCallback(
    (patch: Record<string, string | null>, opts: { step?: StepId; replace?: boolean } = {}) => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      if (opts.step) next.set("step", opts.step);
      const url = `${window.location.pathname}?${next.toString()}`;
      if (opts.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [],
  );

  const goTo = (target: StepId) => navigate({}, { step: target });

  // ---- Step handlers ----
  /** Next step after the lesson step (location is skipped when there is only one). */
  const stepAfterLesson = (s: Service): StepId => {
    const eligible = locations.filter((l) => s.locationIds.length === 0 || s.locationIds.includes(l.id));
    return eligible.some((l) => l.slug === params.get("location")) || eligible.length === 1 ? "datetime" : "location";
  };

  const selectService = (s: Service) => {
    const eligible = locations.filter((l) => s.locationIds.length === 0 || s.locationIds.includes(l.id));
    const keepLocation = eligible.some((l) => l.slug === params.get("location"));
    const sPacks = packagesFor(packages, s);
    const keepPack = sPacks.some((p) => p.id === params.get("pack"));
    setSubmittedDetails(null);
    if (draft) writeDraft({ ...draft, playersCount: s.minPlayers });
    const patch = { service: s.slug, location: keepLocation ? params.get("location") : null, date: null, time: null, pack: keepPack ? params.get("pack") : null };
    if (sPacks.length > 0) {
      // Stay on this step so the player can choose single lesson vs. pack.
      navigate(patch, { step: "lesson", replace: true });
      requestAnimationFrame(() => document.getElementById("plan-selector")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } else {
      navigate(patch, { step: stepAfterLesson(s) });
    }
  };

  const selectPlan = (packageId: string | null) => navigate({ pack: packageId }, { replace: true });

  const selectLocation = (l: Location) => navigate({ location: l.slug, date: null, time: null }, { step: "datetime" });

  const selectDate = useCallback(
    (d: string, opts?: { auto?: boolean }) => navigate({ date: d, time: null }, { replace: true, step: opts?.auto ? undefined : "datetime" }),
    [navigate],
  );

  const selectTime = (t: string) => navigate({ time: t }, { replace: true });

  const saveDraft = useCallback((values: Partial<PlayerDetailsInput>) => {
    writeDraft(values);
  }, []);

  const submitDetails = (values: PlayerDetails) => {
    setSubmittedDetails(values);
    writeDraft(values);
    goTo("review");
  };

  const confirm = () => {
    if (!service || !location || !date || !time || !details) return;
    startTransition(async () => {
      const result = await createBookingAction({ ...details, serviceId: service.id, locationId: location.id, date, startTime: time, packageId: pack?.id ?? null, locale });
      if (result.ok) {
        clearDraft();
        router.push(`${localizePath(locale, "/booking/success")}?ref=${encodeURIComponent(result.reference)}`);
        return;
      }
      toast.error(result.message);
      if (result.code === "slot_unavailable") {
        setRefreshKey((k) => k + 1);
        navigate({ time: null }, { step: "datetime" });
      } else if (result.code === "invalid_input" || result.code === "invalid_players") {
        goTo("details");
      } else if (result.code === "package_unavailable") {
        router.refresh();
        navigate({ pack: null }, { step: "lesson" });
      } else if (result.code === "service_unavailable") {
        router.refresh();
        navigate({ service: null, location: null, date: null, time: null }, { step: "lesson" });
      }
    });
  };

  const back = () => {
    const order: StepId[] = ["lesson", "location", "datetime", "details", "review"];
    let i = stepIndex(step) - 1;
    // skip the location step when it was auto-selected
    if (order[i] === "location" && eligibleLocations.length === 1) i -= 1;
    if (i >= 0) goTo(order[i]);
  };

  const lessonCents = totalPrice(service, playersCount);
  const total = lessonCents !== null && pack ? packPricing(lessonCents, pack).totalCents : lessonCents;
  const showActions = step !== "lesson" || (service !== null && servicePackages.length > 0);

  // ---- Primary action for the current step ----
  let primary: ReactNode = null;
  if (step === "lesson" && service) {
    primary = (
      <Button size="lg" arrow onClick={() => goTo(stepAfterLesson(service))} className="flex-1 md:flex-none">
        {b.continue}
      </Button>
    );
  } else if (step === "datetime") {
    primary = (
      <Button size="lg" arrow disabled={!time} onClick={() => goTo("details")} className="flex-1 md:flex-none">
        {b.continue}
      </Button>
    );
  } else if (step === "details") {
    primary = (
      <Button size="lg" arrow type="submit" form={PLAYER_FORM_ID} className="flex-1 md:flex-none">
        {b.reviewBooking}
      </Button>
    );
  } else if (step === "review") {
    primary = (
      <Button size="lg" onClick={confirm} loading={pending} className="flex-1 md:flex-none" icon={<ShieldCheck aria-hidden className="size-5" />}>
        {pending ? b.confirming : b.confirm}
      </Button>
    );
  }

  return (
    <>
      <div className="on-dark bg-ink pb-8 text-white">
        <Container>
          <StepIndicator current={step} onSelect={goTo} />
        </Container>
      </div>

      <Container className={cn("grid gap-10 pb-36 pt-10 md:pb-24 lg:gap-12", step === "review" ? "max-w-4xl" : "lg:grid-cols-[1fr_380px]")}>
        <div ref={stepRef} tabIndex={-1} className="min-w-0 scroll-mt-28 outline-none">
          {step === "lesson" && (
            <>
              <ServiceSelector services={services} selectedId={service?.id ?? null} onSelect={selectService} />
              {service && servicePackages.length > 0 && lessonCents !== null && (
                <div id="plan-selector" className="scroll-mt-28">
                  <PlanSelector service={service} packages={servicePackages} baseCents={lessonCents} selectedId={pack?.id ?? null} onSelect={selectPlan} />
                </div>
              )}
            </>
          )}

          {step === "location" && service && <LocationSelector locations={eligibleLocations} selectedId={location?.id ?? null} onSelect={selectLocation} />}

          {step === "datetime" && service && location && (
            <div>
              <StepHeading title={b.datetimeTitle} text={`${service.name} · ${location.name}`} />
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <BookingCalendar
                  key={`${service.id}-${location.id}`}
                  serviceId={service.id}
                  locationId={location.id}
                  selected={date}
                  today={today}
                  lastBookable={lastBookable}
                  refreshKey={refreshKey}
                  onSelect={selectDate}
                />
                <div>
                  <h3 className="mb-4 text-lg font-semibold">{b.availableTimes}</h3>
                  <TimeSlotSelector serviceId={service.id} locationId={location.id} date={date} selected={time} refreshKey={refreshKey} onSelect={selectTime} />
                </div>
              </div>
              <BookingWindowNote locale={locale} window={bookingWindow} className="mt-6" />
            </div>
          )}

          {step === "details" && service && draft !== null && (
            <PlayerForm service={service} defaultValues={details ?? draft} onSubmit={submitDetails} onChange={saveDraft} />
          )}

          {step === "review" && service && location && date && time && details && (
            <ReviewStep service={service} location={location} date={date} time={time} details={details} pack={pack} bookingWindow={bookingWindow} onEdit={goTo} />
          )}

          {/* Step actions — inline on desktop… */}
          {showActions && (
            <div className="mt-10 hidden items-center justify-between gap-3 border-t border-line pt-6 md:flex">
              {step !== "lesson" ? (
                <Button variant="outline" size="lg" onClick={back} icon={<ArrowLeft aria-hidden className="size-5" />}>
                  {b.back}
                </Button>
              ) : (
                <span />
              )}
              {primary}
            </div>
          )}
        </div>

        <aside className={cn("hidden", step !== "review" && "lg:block")} aria-label={b.summary.title}>
          <div className="sticky top-28">
            <BookingSummary service={service} location={location} date={date} time={time} playersCount={playersCount} pack={pack} />
          </div>
        </aside>
      </Container>

      {/* …and a sticky thumb-reach bar on mobile */}
      {showActions && (
        <div className="on-dark safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/95 px-4 pt-3 text-white backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3">
            {step !== "lesson" && (
              <Button variant="outline-dark" size="lg" onClick={back} className="shrink-0 px-4" aria-label={b.backAria}>
                <ArrowLeft aria-hidden className="size-5" />
              </Button>
            )}
            {total !== null && service && (
              <div className="min-w-0 leading-tight">
                <p className="text-[0.6875rem] uppercase tracking-wider text-muted-dark">{pack ? fill(b.packLabel, { n: pack.lessonsCount }) : b.total}</p>
                <p className="tabular text-lg font-bold">{formatPrice(total, service.currency, locale)}</p>
              </div>
            )}
            <div className="ml-auto flex">{primary}</div>
          </div>
        </div>
      )}
    </>
  );
}
