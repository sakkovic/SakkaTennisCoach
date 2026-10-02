export const BOOKING_STEPS = [{ id: "lesson" }, { id: "location" }, { id: "datetime" }, { id: "details" }, { id: "review" }] as const;

export type StepId = (typeof BOOKING_STEPS)[number]["id"];

export const stepIndex = (id: StepId) => BOOKING_STEPS.findIndex((s) => s.id === id);

export function isStepId(value: string | null): value is StepId {
  return BOOKING_STEPS.some((s) => s.id === value);
}
