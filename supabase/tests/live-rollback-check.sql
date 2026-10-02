-- Live check of the booking rules on the REAL database, without changing anything:
-- everything runs inside one transaction that is ROLLED BACK at the end.
--   npx supabase db query --linked -f supabase/tests/live-rollback-check.sql
-- Plays three roles: a visitor (anon), a signed-in non-admin, and the coach (admin).
begin;

create temp table t_results (n serial, check_name text, ok boolean, detail text) on commit drop;
grant all on t_results to anon, authenticated;
grant usage on sequence t_results_n_seq to anon, authenticated;

do $$
declare
  v_admin uuid := (select u.id from auth.users u join public.profiles p on p.id = u.id where p.role = 'admin' limit 1);
  v_svc   uuid := (select id from public.services where slug = 'private-lesson');
  v_loc   uuid := (select id from public.locations where slug = 'tennis-club-hammam-sousse');
  v_pack  uuid := (select id from public.packages where lessons_count = 10 limit 1);
  v_max_pending int := (select max_pending_per_email from public.coach_settings where id = 1);
  v_today date := (now() at time zone 'Africa/Tunis')::date;
  v_date date; v_date2 date; v_time time; v_time2 time;
  v_id uuid; v_ref text; v_ref2 text; v_n int; v_txt text; v_bool boolean; v_int int;

begin
  -- Each role switch also switches the JWT claims, exactly like a real Supabase request.

  ------------------------------------------------------------------ visitor
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';

  select min(d), max(d) into v_date, v_date2 from public.get_available_dates(v_svc, v_loc, v_today - 5, v_today + 30) d;
  insert into t_results (check_name, ok, detail) values
    ('window: first bookable day is after today', v_date > v_today, v_date::text),
    ('window: last bookable day is at most today + 7', v_date2 <= v_today + 7, v_date2::text);

  select slot_start into v_time from public.get_available_slots(v_svc, v_loc, v_date) order by slot_start limit 1;
  select slot_start into v_time2 from public.get_available_slots(v_svc, v_loc, v_date) order by slot_start offset 2 limit 1;

  select booking_id, booking_reference into v_id, v_ref
  from public.create_booking(v_svc, v_loc, v_date, v_time, 'Rollback', 'Test', 'rollback.test@example.com', '+21620000000', 'beginner', 1, null, null, 'fr');
  insert into t_results (check_name, ok, detail) values ('visitor can book a free slot', v_ref like 'SSK-%', v_ref || ' ' || v_date || ' ' || v_time);

  select exists (select 1 from public.get_available_slots(v_svc, v_loc, v_date) where slot_start = v_time) into v_bool;
  insert into t_results (check_name, ok, detail) values ('booked slot disappears from availability', not v_bool, null);

  begin
    perform public.create_booking(v_svc, v_loc, v_date, v_time, 'Second', 'Player', 'second@example.com', '+21620000001', 'advanced', 1);
    insert into t_results (check_name, ok, detail) values ('same slot cannot be booked twice', false, 'second booking was accepted!');
  exception when others then
    insert into t_results (check_name, ok, detail) values ('same slot cannot be booked twice', sqlerrm like '%slot_unavailable%', sqlerrm);
  end;

  begin
    perform public.create_booking(v_svc, v_loc, v_today + 9, '10:00', 'Too', 'Far', 'far@example.com', '+21620000002', 'advanced', 1);
    insert into t_results (check_name, ok, detail) values ('booking 9 days ahead is refused', false, 'accepted!');
  exception when others then
    insert into t_results (check_name, ok, detail) values ('booking 9 days ahead is refused', sqlerrm like '%slot_unavailable%', sqlerrm);
  end;

  begin
    perform public.create_booking(v_svc, v_loc, v_today, '19:00', 'Too', 'Soon', 'soon@example.com', '+21620000003', 'advanced', 1);
    insert into t_results (check_name, ok, detail) values ('booking today (< 24 h) is refused', false, 'accepted!');
  exception when others then
    insert into t_results (check_name, ok, detail) values ('booking today (< 24 h) is refused', sqlerrm like '%slot_unavailable%', sqlerrm);
  end;

  begin
    perform public.create_booking(v_svc, v_loc, v_date, v_time2, 'Three', 'Players', 'three@example.com', '+21620000004', 'advanced', 3);
    insert into t_results (check_name, ok, detail) values ('3 players on a 1-player lesson is refused', false, 'accepted!');
  exception when others then
    insert into t_results (check_name, ok, detail) values ('3 players on a 1-player lesson is refused', sqlerrm like '%invalid_players%', sqlerrm);
  end;

  select status::text into v_txt from public.get_booking_summary(v_ref);
  insert into t_results (check_name, ok, detail) values ('new booking is pending (awaiting coach approval)', v_txt = 'pending', v_txt);

  select count(*) into v_n from public.bookings;
  insert into t_results (check_name, ok, detail) values ('visitor cannot read any booking', v_n = 0, v_n || ' rows');

  -- 10-lesson pack: 10 × $54 = $540
  select booking_reference into v_ref2
  from public.create_booking(v_svc, v_loc, v_date, v_time2, 'Pack', 'Buyer', 'pack.rollback@example.com', '+21620000005', 'intermediate', 1, null, v_pack, 'en');
  select package_total_cents into v_int from public.get_booking_summary(v_ref2);
  insert into t_results (check_name, ok, detail) values ('10-lesson pack total is $540 (−10 %)', v_int = 54000, v_int::text);

  ------------------------------------------------------------------ signed-in stranger (not admin)
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-2222-3333-4444-555555555555"}', true);
  perform set_config('request.jwt.claim.sub', '11111111-2222-3333-4444-555555555555', true);
  execute 'set local role authenticated';
  select count(*) into v_n from public.bookings;
  update public.bookings set status = 'confirmed' where id = v_id;
  get diagnostics v_int = row_count;
  update public.profiles set role = 'admin' where id = '11111111-2222-3333-4444-555555555555';
  get diagnostics v_bool = row_count;
  insert into t_results (check_name, ok, detail) values ('a non-admin account cannot read or change bookings', v_n = 0 and v_int = 0, v_n || ' read, ' || v_int || ' changed');

  ------------------------------------------------------------------ the coach (admin)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin)::text, true);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.bookings where id = v_id;
  insert into t_results (check_name, ok, detail) values ('coach sees the booking', v_n = 1, null);

  update public.bookings set status = 'confirmed' where id = v_id;
  get diagnostics v_int = row_count;
  select count(*) into v_n from public.booking_events where booking_id = v_id and to_status = 'confirmed';
  insert into t_results (check_name, ok, detail) values ('coach approves → confirmed, logged in history', v_int = 1 and v_n = 1, null);

  update public.bookings set status = 'cancelled', cancellation_reason = 'Rollback test' where id = v_id;
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  select exists (select 1 from public.get_available_slots(v_svc, v_loc, v_date) where slot_start = v_time) into v_bool;
  insert into t_results (check_name, ok, detail) values ('cancelling frees the slot for other players', v_bool, null);

  execute 'reset role'; perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin)::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); execute 'set local role authenticated';
  update public.bookings set status = 'pending' where id = v_id;
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  select exists (select 1 from public.get_available_slots(v_svc, v_loc, v_date) where slot_start = v_time) into v_bool;
  insert into t_results (check_name, ok, detail) values ('reopening takes the slot again', not v_bool, null);

  -- Blocked day
  execute 'reset role'; perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin)::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); execute 'set local role authenticated';
  insert into public.blocked_dates (date_from, date_to, reason) values (v_date2, v_date2, 'Rollback test');
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  select exists (select 1 from public.get_available_dates(v_svc, v_loc, v_today, v_today + 30) d where d = v_date2) into v_bool;
  insert into t_results (check_name, ok, detail) values ('blocked day disappears from booking', not v_bool, v_date2::text);

  -- Booking window setting
  execute 'reset role'; perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin)::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); execute 'set local role authenticated';
  update public.coach_settings set max_advance_days = 14 where id = 1;
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  select max(d) into v_date2 from public.get_available_dates(v_svc, v_loc, v_today, v_today + 30) d;
  insert into t_results (check_name, ok, detail) values ('changing the window to 14 days applies immediately', v_date2 > v_today + 7, v_date2::text);

  -- Prices
  execute 'reset role'; perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin)::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); execute 'set local role authenticated';
  update public.services set price_cents = 6500 where id = v_svc;
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  select price_cents into v_int from public.services where id = v_svc;
  insert into t_results (check_name, ok, detail) values ('coach price change is visible to visitors', v_int = 6500, v_int::text);

  -- Journey post
  execute 'reset role'; perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin)::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); execute 'set local role authenticated';
  insert into public.journey_posts (kind, title, image_url, is_published) values ('news', 'Rollback test post', 'https://example.com/x.jpg', true);
  insert into public.journey_posts (kind, title, image_url, is_published) values ('news', 'Rollback draft', 'https://example.com/y.jpg', false);
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  select count(*) filter (where title = 'Rollback test post'), count(*) filter (where title = 'Rollback draft') into v_n, v_int from public.journey_posts;
  insert into t_results (check_name, ok, detail) values ('published post is public, draft stays hidden', v_n = 1 and v_int = 0, null);

  -- Anti-spam: max pending requests per email in 24 h
  begin
    for i in 1 .. v_max_pending + 1 loop
      select slot_start into v_time2 from public.get_available_slots(v_svc, v_loc, v_date) order by slot_start desc offset 0 limit 1;
      perform public.create_booking(v_svc, v_loc, v_date, v_time2, 'Spam', 'N' || i, 'spam.rollback@example.com', '+21620000009', 'beginner', 1);
    end loop;
    insert into t_results (check_name, ok, detail) values ('anti-spam limit per email', false, 'all accepted');
  exception when others then
    insert into t_results (check_name, ok, detail) values ('anti-spam limit per email (' || v_max_pending || ' pending)', sqlerrm like '%rate_limited%', sqlerrm);
  end;

  execute 'reset role';
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, check_name, coalesce(detail, '') as detail from t_results order by n;

rollback;
