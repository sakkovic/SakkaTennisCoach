"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@/lib/booking/types";

type Result<T> = { key: string; status: "ready" | "error"; data: T | null };

/**
 * Small fetch hook for the availability API. Loading state is derived from the
 * request key (no synchronous setState in effects); stale requests are aborted.
 */
function useAvailabilityQuery<T>(params: Record<string, string> | null, pick: (json: unknown) => T, refreshKey: number) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const query = params ? new URLSearchParams(params).toString() : null;
  const requestKey = query ? `${query}#${refreshKey}#${retry}` : null;

  useEffect(() => {
    if (!query || !requestKey) return;
    const controller = new AbortController();
    fetch(`/api/availability?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        setResult({ key: requestKey, status: "ready", data: pick(await res.json()) });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({ key: requestKey, status: "error", data: null });
      });
    return () => controller.abort();
    // `pick` is a stable module-level function in callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const current = result?.key === requestKey ? result : null;
  const status: "idle" | "loading" | "ready" | "error" = !requestKey ? "idle" : (current?.status ?? "loading");
  return { status, data: current?.data ?? null, retry: () => setRetry((n) => n + 1) };
}

const pickDates = (json: unknown) => (json as { dates: string[] }).dates;
const pickSlots = (json: unknown) => (json as { slots: Slot[] }).slots;

export function useAvailableDates(serviceId: string, locationId: string, month: string, refreshKey: number) {
  return useAvailabilityQuery({ service: serviceId, location: locationId, month }, pickDates, refreshKey);
}

export function useAvailableSlots(serviceId: string, locationId: string, date: string | null, refreshKey: number) {
  return useAvailabilityQuery(date ? { service: serviceId, location: locationId, date } : null, pickSlots, refreshKey);
}
