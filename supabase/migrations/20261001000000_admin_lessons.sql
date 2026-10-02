-- =============================================================================
-- Coach-created lessons (one-off or recurring)
--  * booking_series groups recurring lessons (daily / weekly / monthly)
--  * lessons created by the coach may have no email/phone (source = 'admin')
-- Overlaps are still impossible: the bookings_no_overlap constraint applies to every row.
-- =============================================================================

create table public.booking_series (
  id              uuid primary key default gen_random_uuid(),
  frequency       text not null check (frequency in ('daily', 'weekly', 'monthly')),
  interval_count  smallint not null default 1 check (interval_count between 1 and 12),
  starts_on       date not null,
  ends_on         date,
  occurrences     int check (occurrences between 1 and 100),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);

alter table public.booking_series enable row level security;

create policy "series_admin_all" on public.booking_series
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.bookings
  add column series_id uuid references public.booking_series (id) on delete set null,
  alter column email drop not null,
  alter column phone drop not null,
  -- Online bookings must keep full contact details; the coach may skip them.
  add constraint bookings_contact_required check (source = 'admin' or (email is not null and phone is not null));

create index bookings_series_idx on public.bookings (series_id) where series_id is not null;
