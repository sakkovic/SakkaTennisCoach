-- =============================================================================
-- Lesson packs (e.g. 5 lessons −5%, 10 lessons −10%, valid 30 days)
--  * packages: configurable from the dashboard; no package_services rows = all services
--  * the player requests a pack online by booking the first lesson; the coach
--    schedules the remaining lessons from the dashboard
--  * bookings snapshot the pack (name, size, discount, total) like they snapshot prices
-- Also switches the default currency to USD.
-- =============================================================================

alter table public.services       alter column currency set default 'USD';
alter table public.coach_settings alter column currency set default 'USD';

create table public.packages (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 80),
  description       text check (char_length(description) <= 300),
  lessons_count     smallint not null check (lessons_count between 2 and 50),
  discount_percent  smallint not null default 0 check (discount_percent between 0 and 90),
  validity_days     smallint not null default 30 check (validity_days between 1 and 365),
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger packages_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

-- A package with no rows here applies to every service.
create table public.package_services (
  package_id  uuid not null references public.packages (id) on delete cascade,
  service_id  uuid not null references public.services (id) on delete cascade,
  primary key (package_id, service_id)
);

alter table public.packages         enable row level security;
alter table public.package_services enable row level security;

create policy "packages_public_read" on public.packages for select using (is_active or public.is_admin());
create policy "packages_admin_all" on public.packages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "package_services_public_read" on public.package_services for select using (true);
create policy "package_services_admin_all" on public.package_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pack snapshot on bookings (price_cents stays the per-lesson price, discounted)
alter table public.bookings
  add column package_id               uuid references public.packages (id) on delete set null,
  add column package_name             text,
  add column package_lessons          smallint,
  add column package_discount_percent smallint,
  add column package_total_cents      int check (package_total_cents >= 0);

-- -----------------------------------------------------------------------------
-- create_booking: new optional p_package_id parameter
-- -----------------------------------------------------------------------------
drop function public.create_booking(uuid, uuid, date, time, text, text, text, text, public.player_level, int, text);

create function public.create_booking(
  p_service_id     uuid,
  p_location_id    uuid,
  p_date           date,
  p_start_time     time,
  p_first_name     text,
  p_last_name      text,
  p_email          text,
  p_phone          text,
  p_player_level   public.player_level,
  p_players_count  int,
  p_notes          text default null,
  p_package_id     uuid default null
)
returns table (booking_id uuid, booking_reference text)
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_settings public.coach_settings%rowtype;
  v_service  public.services%rowtype;
  v_location public.locations%rowtype;
  v_package  public.packages%rowtype;
  v_email    text := lower(trim(p_email));
  v_base     int;
  v_price    int;
  v_ref      text;
  v_id       uuid;
begin
  -- One coach: serialize booking attempts for the same day.
  perform pg_advisory_xact_lock(hashtext('ssk-booking:' || p_date::text));

  select * into v_settings from public.coach_settings where id = 1;

  select * into v_service from public.services
  where id = p_service_id and is_active and is_bookable;
  if not found then
    raise exception 'service_unavailable' using errcode = 'P0001';
  end if;

  if p_players_count is null
     or p_players_count < v_service.min_players
     or p_players_count > v_service.max_players then
    raise exception 'invalid_players' using errcode = 'P0001';
  end if;

  if p_package_id is not null then
    select * into v_package from public.packages p
    where p.id = p_package_id and p.is_active
      and (
        not exists (select 1 from public.package_services ps where ps.package_id = p.id)
        or exists (select 1 from public.package_services ps where ps.package_id = p.id and ps.service_id = p_service_id)
      );
    if not found then
      raise exception 'package_unavailable' using errcode = 'P0001';
    end if;
  end if;

  if (
    select count(*) from public.bookings b
    where b.email = v_email and b.status = 'pending' and b.created_at > now() - interval '24 hours'
  ) >= v_settings.max_pending_per_email then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Re-validate the slot against rules, blocks, bookings, notice and window.
  if not exists (
    select 1 from public.get_available_slots(p_service_id, p_location_id, p_date) s
    where s.slot_start = p_start_time
  ) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  select * into v_location from public.locations where id = p_location_id;

  -- Keep in sync with lib/booking/packages.ts
  v_base  := case when v_service.pricing_unit = 'per_player' then v_service.price_cents * p_players_count else v_service.price_cents end;
  v_price := case when p_package_id is null then v_base else round(v_base * (100 - v_package.discount_percent) / 100.0)::int end;

  loop
    v_ref := 'SSK-' || public.generate_reference(6);
    exit when not exists (select 1 from public.bookings where reference = v_ref);
  end loop;

  begin
    insert into public.bookings (
      reference, first_name, last_name, email, phone, player_level, players_count, notes,
      service_id, location_id, booking_date, start_time, end_time,
      service_name, location_name, duration_min, price_cents, currency, source,
      package_id, package_name, package_lessons, package_discount_percent, package_total_cents
    ) values (
      v_ref, trim(p_first_name), trim(p_last_name), v_email, trim(p_phone), p_player_level, p_players_count,
      nullif(trim(p_notes), ''),
      p_service_id, p_location_id, p_date, p_start_time,
      (p_date + p_start_time + make_interval(mins => v_service.duration_min))::time,
      v_service.name, v_location.name, v_service.duration_min, v_price, v_service.currency, 'web',
      v_package.id, v_package.name, v_package.lessons_count, v_package.discount_percent,
      case when p_package_id is null then null else v_price * v_package.lessons_count end
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  booking_id := v_id;
  booking_reference := v_ref;
  return next;
end;
$$;

grant execute on function public.create_booking(uuid, uuid, date, time, text, text, text, text, public.player_level, int, text, uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_booking_summary: include the pack (still no personal data)
-- -----------------------------------------------------------------------------
drop function public.get_booking_summary(text);

create function public.get_booking_summary(p_reference text)
returns table (
  reference text, service_name text, location_name text, booking_date date,
  start_time time, end_time time, duration_min int, price_cents int, currency char(3),
  status public.booking_status, players_count smallint,
  package_name text, package_lessons smallint, package_discount_percent smallint, package_total_cents int
)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.reference, b.service_name, b.location_name, b.booking_date, b.start_time, b.end_time,
         b.duration_min, b.price_cents, b.currency, b.status, b.players_count,
         b.package_name, b.package_lessons, b.package_discount_percent, b.package_total_cents
  from public.bookings b
  where b.reference = upper(p_reference)
  limit 1;
$$;

grant execute on function public.get_booking_summary(text) to anon, authenticated;
