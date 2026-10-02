@AGENTS.md

## Project notes

- Business info lives only in `config/site.ts`; editorial copy in `content/`. Prices, services, locations and availability live in the database — never hardcode them in components.
- All data access goes through `getRepository()` (`lib/data`). Keep `supabase-repo.ts` and `demo-repo.ts` in sync with the `Repository` interface.
- Slot rules exist twice: `supabase/migrations/*` (`get_available_slots`, authoritative) and `lib/booking/slots.ts` (reference + demo). Change both together; run `npm run check`.
- Dates are `YYYY-MM-DD` strings and times `HH:mm` in the coach's timezone — use `lib/booking/time.ts`, never `new Date(date)` for calendar dates.
- Every admin Server Action starts with `await requireAdmin()` and validates with Zod.
- Use design tokens from `app/globals.css` (`bg-ink`, `text-lime`, `text-muted`…), not raw hex. Lime is an accent: never lime text on white.
- lucide-react 1.x has no brand icons — use `components/ui/BrandIcons.tsx`.
