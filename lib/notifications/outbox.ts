import "server-only";

/**
 * Local email outbox. When no email provider is configured (RESEND_API_KEY),
 * every email the site would send is kept here so it can be previewed in
 * Admin → Emails. Lives for the lifetime of the server process.
 */
export type OutboxEmail = { id: string; to: string; subject: string; html: string; replyTo?: string; createdAt: string; delivered: boolean };

const globalOutbox = globalThis as unknown as { __sskOutbox?: OutboxEmail[] };

export function recordEmail(email: Omit<OutboxEmail, "id" | "createdAt">) {
  const list = (globalOutbox.__sskOutbox ??= []);
  list.unshift({ ...email, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  if (list.length > 100) list.length = 100;
}

export function listOutbox(): OutboxEmail[] {
  return globalOutbox.__sskOutbox ?? [];
}

export function clearOutbox() {
  globalOutbox.__sskOutbox = [];
}
