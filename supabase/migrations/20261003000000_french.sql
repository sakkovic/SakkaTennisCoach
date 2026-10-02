-- =============================================================================
-- French version of the website
--  * optional *_fr columns for content the coach edits (falls back to English)
--  * bookings remember the player's language (emails are sent in that language)
-- =============================================================================

alter table public.services
  add column name_fr              text check (char_length(name_fr) <= 120),
  add column short_description_fr text check (char_length(short_description_fr) <= 200),
  add column description_fr       text check (char_length(description_fr) <= 2000),
  add column best_for_fr          text check (char_length(best_for_fr) <= 200),
  add column includes_fr          text[] not null default '{}';

alter table public.packages
  add column name_fr        text check (char_length(name_fr) <= 80),
  add column description_fr text check (char_length(description_fr) <= 300);

alter table public.journey_posts
  add column title_fr  text check (char_length(title_fr) <= 140),
  add column body_fr   text check (char_length(body_fr) <= 1500),
  add column result_fr text check (char_length(result_fr) <= 120);

alter table public.bookings
  add column locale text not null default 'en' check (locale in ('en', 'fr'));

-- -----------------------------------------------------------------------------
-- create_booking: new optional p_locale parameter (stored on the booking)
-- -----------------------------------------------------------------------------
drop function public.create_booking(uuid, uuid, date, time, text, text, text, text, public.player_level, int, text, uuid);

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
  p_package_id     uuid default null,
  p_locale         text default 'en'
)
returns table (booking_id uuid, booking_reference text)
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_settings public.coach_settings%rowtype;
  v_service  public.services%rowtype;
  v_location public.locations%rowtype;
  v_package  public.packages%rowtype;
  v_email    text := lower(trim(p_email));
  v_locale   text := case when p_locale = 'fr' then 'fr' else 'en' end;
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
      service_name, location_name, duration_min, price_cents, currency, source, locale,
      package_id, package_name, package_lessons, package_discount_percent, package_total_cents
    ) values (
      v_ref, trim(p_first_name), trim(p_last_name), v_email, trim(p_phone), p_player_level, p_players_count,
      nullif(trim(p_notes), ''),
      p_service_id, p_location_id, p_date, p_start_time,
      (p_date + p_start_time + make_interval(mins => v_service.duration_min))::time,
      v_service.name, v_location.name, v_service.duration_min, v_price, v_service.currency, 'web', v_locale,
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

grant execute on function public.create_booking(uuid, uuid, date, time, text, text, text, text, public.player_level, int, text, uuid, text) to anon, authenticated;
