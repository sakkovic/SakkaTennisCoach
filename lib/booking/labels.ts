import type { Service } from "@/lib/booking/types";
import type { Dictionary } from "@/lib/i18n/config-types";

/** "1 player", "2 players", "3–4 players" in the visitor's language (server and client). */
export function playersLabel(s: Pick<Service, "minPlayers" | "maxPlayers">, t: Dictionary) {
  if (s.maxPlayers === 1) return `1 ${t.common.player}`;
  if (s.minPlayers === s.maxPlayers) return `${s.minPlayers} ${t.common.players}`;
  return `${s.minPlayers}–${s.maxPlayers} ${t.common.players}`;
}
