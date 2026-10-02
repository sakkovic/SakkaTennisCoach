-- Fixes from the Supabase security & performance advisor.

-- 1. Trigger function: never callable through the API (it only runs as a trigger).
revoke execute on function public.bookings_log_status() from public, anon, authenticated;

-- 2. profiles: evaluate auth.uid() once per query instead of once per row.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

-- 3. Indexes for foreign keys (faster joins and safe deletes of the referenced rows).
create index if not exists availability_rules_location_idx on public.availability_rules (location_id);
create index if not exists booking_events_actor_idx on public.booking_events (actor);
create index if not exists booking_series_created_by_idx on public.booking_series (created_by);
create index if not exists bookings_location_idx on public.bookings (location_id);
create index if not exists bookings_package_idx on public.bookings (package_id);
create index if not exists bookings_player_idx on public.bookings (player_id);
create index if not exists bookings_service_idx on public.bookings (service_id);
create index if not exists package_services_service_idx on public.package_services (service_id);
create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists service_locations_location_idx on public.service_locations (location_id);
