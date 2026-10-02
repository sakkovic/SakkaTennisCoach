/** Human-friendly booking reference, e.g. "SSK-7F3K2Q" (no 0/O/1/I ambiguity). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "SSK-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
