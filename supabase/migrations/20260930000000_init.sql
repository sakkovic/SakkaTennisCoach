-- =============================================================================
-- Sami Sakka Tennis — initial schema
-- Guest booking (no player accounts), one coach, admin via Supabase Auth.
-- Double-booking is prevented by an exclusion constraint + an advisory lock in
-- create_booking(). Public users never read the bookings table directly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type public.player_level   as enum ('beginner', 'intermediate', 'advanced', 'competitive');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded', 'not_required');
create type public.pricing_unit   as enum ('per_session', 'per_player');

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (admin today, player accounts later)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'player' check (role in ('admin', 'player')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Coach settings (single row)
-- -----------------------------------------------------------------------------
create table public.coach_settings (
  id                    smallint primary key default 1 check (id = 1),
  timezone              text not null default 'Europe/Paris',
  currency              char(3) not null default 'EUR',
  slot_interval_min     int not null default 30 check (slot_interval_min between 5 and 240),
  min_notice_hours      int not null default 12 check (min_notice_hours between 0 and 336),
  max_advance_days      int not null default 60 check (max_advance_days between 1 and 365),
  buffer_min            int not null default 0  check (buffer_min between 0 and 120),
  max_pending_per_email int not null default 3  check (max_pending_per_email between 1 and 50),
  updated_at            timestamptz not null default now()
);

insert into public.coach_settings default values;

create trigger coach_settings_updated_at before update on public.coach_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Locations
-- -----------------------------------------------------------------------------
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 120),
  address     text not null default '',
  city        text,
  maps_url    text,
  lat         double precision,
  lng         double precision,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Services (bookable lesson types — the single source of truth for pricing)
-- -----------------------------------------------------------------------------
create table public.services (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name               text not null check (char_length(name) between 2 and 120),
  short_description  text not null default '',
  description        text,
  best_for           text,
  includes           text[] not null default '{}',
  duration_min       int not null check (duration_min between 15 and 480),
  price_cents        int not null check (price_cents >= 0),
  currency           char(3) not null default 'EUR',
  pricing_unit       public.pricing_unit not null default 'per_session',
  min_players        smallint not null default 1 check (min_players >= 1),
  max_players        smallint not null default 1,
  is_bookable        boolean not null default true,
  is_active          boolean not null default true,
  sort_order         int not null default 0,
  image_path         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (max_players >= min_players)
);

create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- A service with no rows here is available at every active location.
create table public.service_locations (
  service_id   uuid not null references public.services (id) on delete cascade,
  location_id  uuid not null references public.locations (id) on delete cascade,
  primary key (service_id, location_id)
);

-- -----------------------------------------------------------------------------
-- Availability
-- -----------------------------------------------------------------------------
create table public.availability_rules (
  id           uuid primary key default gen_random_uuid(),
  weekday      smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time   time not null,
  end_time     time not null,
  location_id  uuid references public.locations (id) on delete cascade, -- null = any location
  valid_from   date,
  valid_until  date,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create index availability_rules_weekday_idx on public.availability_rules (weekday) where is_active;

create table public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  date_from   date not null,
  date_to     date not null,
  start_time  time, -- null start/end = whole day
  end_time    time,
  reason      text,
  created_at  timestamptz not null default now(),
  check (date_to >= date_from),
  check ((start_time is null and end_time is null) or (start_time is not null and end_time is not null and end_time > start_time))
);

create index blocked_dates_range_idx on public.blocked_dates (date_from, date_to);

-- -----------------------------------------------------------------------------
-- Bookings
-- -----------------------------------------------------------------------------
create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,

  -- Player (guest booking — no account required)
  first_name           text not null check (char_length(first_name) between 1 and 80),
  last_name            text not null check (char_length(last_name) between 1 and 80),
  email                text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone                text not null check (char_length(phone) between 6 and 32),
  player_level         public.player_level not null,
  players_count        smallint not null default 1 check (players_count between 1 and 12),
  notes                text check (char_length(notes) <= 2000),
  player_id            uuid references public.profiles (id) on delete set null, -- future accounts

  -- What / where / when
  service_id           uuid not null references public.services (id) on delete restrict,
  location_id          uuid not null references public.locations (id) on delete restrict,
  booking_date         date not null,
  start_time           time not null,
  end_time             time not null,
  during               tsrange generated always as (tsrange(booking_date + start_time, booking_date + end_time, '[)')) stored,

  -- Snapshot at booking time (prices can change later without rewriting history)
  service_name         text not null,
  location_name        text not null,
  duration_min         int not null,
  price_cents          int not null check (price_cents >= 0),
  currency             char(3) not null,

  status               public.booking_status not null default 'pending',
  payment_status       public.payment_status not null default 'unpaid',
  source               text not null default 'web' check (source in ('web', 'admin')),
  admin_notes          text,
  cancellation_reason  text,
  confirmed_at         timestamptz,
  cancelled_at         timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  check (end_time > start_time),
  -- The core guarantee: no two active bookings can overlap (single coach).
  constraint bookings_no_overlap exclude using gist (during with &&) where (status in ('pending', 'confirmed'))
);

create index bookings_date_idx on public.bookings (booking_date);
create index bookings_status_idx on public.bookings (status);
create index bookings_email_idx on public.bookings (email);

create or replace function public.bookings_before_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    case new.status
      when 'confirmed' then new.confirmed_at := now();
      when 'cancelled' then new.cancelled_at := now();
      when 'completed' then new.completed_at := now();
      else null;
    end case;
  end if;
  return new;
end;
$$;

create trigger bookings_before_update before update on public.bookings
  for each row execute function public.bookings_before_update();

-- Audit trail of status changes
create table public.booking_events (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  from_status  public.booking_status,
  to_status    public.booking_status not null,
  actor        uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

create or replace function public.bookings_log_status()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, from_status, to_status, actor)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.booking_events (booking_id, from_status, to_status, actor)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return null;
end;
$$;

create trigger bookings_log_status after insert or update of status on public.bookings
  for each row execute function public.bookings_log_status();

-- -----------------------------------------------------------------------------
-- Payments (prepared for Stripe — unused in v1)
-- -----------------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings (id) on delete restrict,
  provider      text not null default 'stripe',
  provider_ref  text,
  amount_cents  int not null check (amount_cents >= 0),
  currency      char(3) not null,
  status        text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Contact messages
-- -----------------------------------------------------------------------------
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  phone       text check (char_length(phone) <= 32),
  message     text not null check (char_length(message) between 1 and 5000),
  status      text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Booking functions (the only way the public touches availability & bookings)
-- Keep in sync with lib/booking/slots.ts (reference implementation + tests).
-- =============================================================================

create or replace function public.get_available_slots(p_service_id uuid, p_location_id uuid, p_date date)
returns table (slot_start time, slot_end time)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_settings public.coach_settings%rowtype;
  v_service  public.services%rowtype;
  v_now      timestamp;
  v_dur      interval;
  v_step     interval;
  v_buf      interval;
begin
  select * into v_settings from public.coach_settings where id = 1;

  select * into v_service from public.services s
  where s.id = p_service_id and s.is_active and s.is_bookable;
  if not found then return; end if;

  -- Location must be active and allowed for this service
  if not exists (
    select 1 from public.locations l
    where l.id = p_location_id and l.is_active
      and (
        not exists (select 1 from public.service_locations sl where sl.service_id = p_service_id)
        or exists (select 1 from public.service_locations sl where sl.service_id = p_service_id and sl.location_id = p_location_id)
      )
  ) then return; end if;

  v_now := now() at time zone v_settings.timezone;
  if p_date < v_now::date or p_date > v_now::date + v_settings.max_advance_days then return; end if;

  -- Whole-day block
  if exists (
    select 1 from public.blocked_dates b
    where p_date between b.date_from and b.date_to and b.start_time is null
  ) then return; end if;

  v_dur  := make_interval(mins => v_service.duration_min);
  v_step := make_interval(mins => v_settings.slot_interval_min);
  v_buf  := make_interval(mins => v_settings.buffer_min);

  return query
  with windows as (
    select p_date + r.start_time as ws, p_date + r.end_time as we
    from public.availability_rules r
    where r.is_active
      and r.weekday = extract(dow from p_date)::int
      and (r.location_id is null or r.location_id = p_location_id)
      and (r.valid_from is null or r.valid_from <= p_date)
      and (r.valid_until is null or r.valid_until >= p_date)
  ),
  candidates as (
    select distinct gs as st
    from windows w
    cross join lateral generate_series(w.ws, w.we - v_dur, v_step) as gs
  )
  select c.st::time, (c.st + v_dur)::time
  from candidates c
  where c.st >= v_now + make_interval(hours => v_settings.min_notice_hours)
    and not exists (
      select 1 from public.blocked_dates b
      where p_date between b.date_from and b.date_to
        and b.start_time is not null
        and tsrange(p_date + b.start_time, p_date + b.end_time, '[)') && tsrange(c.st, c.st + v_dur, '[)')
    )
    and not exists (
      select 1 from public.bookings bk
      where bk.status in ('pending', 'confirmed')
        and bk.during && tsrange(c.st - v_buf, c.st + v_dur + v_buf, '[)')
    )
  order by c.st;
end;
$$;

-- Dates in [p_from, p_to] with at least one free slot (max 62 days per call).
create or replace function public.get_available_dates(p_service_id uuid, p_location_id uuid, p_from date, p_to date)
returns setof date
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_to - p_from > 62 then
    p_to := p_from + 62;
  end if;
  return query
  select d::date
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d
  where exists (select 1 from public.get_available_slots(p_service_id, p_location_id, d::date));
end;
$$;

create or replace function public.generate_reference(p_len int)
returns text language sql volatile set search_path = public, pg_temp as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, p_len);
$$;

create or replace function public.create_booking(
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
  p_notes          text default null
)
returns table (booking_id uuid, booking_reference text)
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_settings public.coach_settings%rowtype;
  v_service  public.services%rowtype;
  v_location public.locations%rowtype;
  v_email    text := lower(trim(p_email));
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

  loop
    v_ref := 'SSK-' || public.generate_reference(6);
    exit when not exists (select 1 from public.bookings where reference = v_ref);
  end loop;

  begin
    insert into public.bookings (
      reference, first_name, last_name, email, phone, player_level, players_count, notes,
      service_id, location_id, booking_date, start_time, end_time,
      service_name, location_name, duration_min, price_cents, currency, source
    ) values (
      v_ref, trim(p_first_name), trim(p_last_name), v_email, trim(p_phone), p_player_level, p_players_count,
      nullif(trim(p_notes), ''),
      p_service_id, p_location_id, p_date, p_start_time,
      (p_date + p_start_time + make_interval(mins => v_service.duration_min))::time,
      v_service.name, v_location.name, v_service.duration_min,
      case when v_service.pricing_unit = 'per_player' then v_service.price_cents * p_players_count else v_service.price_cents end,
      v_service.currency, 'web'
    )
    returning id into v_id;
  exception when exclusion_violation then
    -- Last line of defence: someone took the slot in the same instant.
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  booking_id := v_id;
  booking_reference := v_ref;
  return next;
end;
$$;

-- Public success page — no personal data.
create or replace function public.get_booking_summary(p_reference text)
returns table (
  reference text, service_name text, location_name text, booking_date date,
  start_time time, end_time time, duration_min int, price_cents int, currency char(3),
  status public.booking_status, players_count smallint
)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.reference, b.service_name, b.location_name, b.booking_date, b.start_time, b.end_time,
         b.duration_min, b.price_cents, b.currency, b.status, b.players_count
  from public.bookings b
  where b.reference = upper(p_reference)
  limit 1;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.coach_settings      enable row level security;
alter table public.locations           enable row level security;
alter table public.services            enable row level security;
alter table public.service_locations   enable row level security;
alter table public.availability_rules  enable row level security;
alter table public.blocked_dates       enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_events      enable row level security;
alter table public.payments            enable row level security;
alter table public.contact_messages    enable row level security;

-- Profiles: users see their own; admins see and manage all.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Settings: public read (timezone, notice…), admin write.
create policy "settings_public_read" on public.coach_settings for select using (true);
create policy "settings_admin_update" on public.coach_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Services & locations: public sees active rows; admin manages everything.
create policy "services_public_read" on public.services for select using (is_active or public.is_admin());
create policy "services_admin_all" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "locations_public_read" on public.locations for select using (is_active or public.is_admin());
create policy "locations_admin_all" on public.locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "service_locations_public_read" on public.service_locations for select using (true);
create policy "service_locations_admin_all" on public.service_locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Availability, blocks, bookings, events, payments: admin only.
-- (The public reaches availability exclusively through the functions above.)
create policy "availability_admin_all" on public.availability_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "blocked_admin_all" on public.blocked_dates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bookings_admin_all" on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "booking_events_admin_read" on public.booking_events
  for select to authenticated using (public.is_admin());
create policy "payments_admin_all" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Contact: anyone may submit (insert only); admin reads/manages.
create policy "contact_public_insert" on public.contact_messages
  for insert to anon, authenticated with check (status = 'new');
create policy "contact_admin_all" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Function privileges
-- =============================================================================
revoke execute on function public.generate_reference(int) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.get_available_slots(uuid, uuid, date) to anon, authenticated;
grant execute on function public.get_available_dates(uuid, uuid, date, date) to anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, date, time, text, text, text, text, public.player_level, int, text) to anon, authenticated;
grant execute on function public.get_booking_summary(text) to anon, authenticated;
