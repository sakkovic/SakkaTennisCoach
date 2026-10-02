/**
 * Database tests: runs the real migration + seed on PGlite (Postgres in WASM) with
 * stubbed Supabase auth, then checks slots, double-booking prevention, blocks,
 * rate limiting, audit log and Row Level Security.  Run: npm run test:db
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const db = new PGlite({ extensions: { btree_gist } });

let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => {
  if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, extra); }
};
const expectError = async (sql, params, match, name) => {
  try { await db.query(sql, params); ok(false, name, "(no error)"); }
  catch (e) { ok(String(e.message).includes(match) || e.code === match, name, `${e.code} ${e.message}`); }
};

// --- Supabase stubs: auth schema, auth.uid(), roles ---------------------------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  -- Supabase Storage stub
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
`);

for (const file of readdirSync(`${root}/migrations`).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(`${root}/migrations/${file}`, "utf8"));
}
ok(true, "migration applied");
await db.exec(readFileSync(`${root}/seed.sql`, "utf8"));
ok(true, "seed applied");

// Deterministic settings for tests
ok((await db.query(`select min_notice_hours, max_advance_days from coach_settings`)).rows[0]?.max_advance_days === 7, "seeded booking window: 24 h to 7 days");
await db.exec(`update coach_settings set timezone = 'UTC', min_notice_hours = 0, max_advance_days = 60, slot_interval_min = 30, buffer_min = 0;`);
ok((await db.query(`select maps_url from locations where slug = 'tennis-club-hammam-sousse'`)).rows[0]?.maps_url?.startsWith("https://maps.app.goo.gl/"), "seeded Tennis Club Hammam Sousse with Google Maps link");

// Test-only fixtures: a second court and a padel-only venue (one coach, several places)
await db.exec(`
  insert into locations (slug, name, address) values ('test-second-court', 'Second Court', 'x'), ('test-padel-center', 'Padel Center', 'y');
  insert into service_locations (service_id, location_id)
    select s.id, l.id from services s cross join locations l
    where (s.slug = 'padel-coaching' and l.slug = 'test-padel-center')
       or (s.slug <> 'padel-coaching' and l.slug in ('tennis-club-hammam-sousse', 'test-second-court'));
`);

const ids = (await db.query(`
  select (select id from services where slug='private-lesson') as private,
         (select id from services where slug='competition-training') as comp,
         (select id from services where slug='group-training') as grp,
         (select id from services where slug='padel-coaching') as padel,
         (select id from locations where slug='tennis-club-hammam-sousse') as central,
         (select id from locations where slug='test-second-court') as river,
         (select id from locations where slug='test-padel-center') as padelc,
         (current_date + ((8 - extract(dow from current_date)::int) % 7 + 7))::text as monday
`)).rows[0];
const { monday } = ids;
console.log("test monday:", monday);

const slots = async (svc, loc, date = monday) =>
  (await db.query(`select to_char(slot_start,'HH24:MI') s from get_available_slots($1,$2,$3::date)`, [svc, loc, date])).rows.map((r) => r.s);

let s = await slots(ids.private, ids.central);
ok(s[0] === "08:00" && s.includes("11:00") && !s.includes("11:30") && s.includes("19:00") && !s.includes("19:30"), "slots generated from weekly rules", s.join(","));

ok((await slots(ids.padel, ids.central)).length === 0, "service not offered at location → no slots");
ok((await slots(ids.private, ids.central, (await db.query(`select ($1::date + 6)::text d`, [monday])).rows[0].d)).length === 0, "sunday has no rules → no slots");

const book = (svc, loc, time, email = "a@example.com", players = 1, date = monday) =>
  db.query(`select * from create_booking($1,$2,$3::date,$4::time,'Ana','Test',$5,'+33 600000000','intermediate',$6,null)`, [svc, loc, date, time, email, players]);

const r1 = await book(ids.private, ids.central, "09:00");
ok(/^SSK-[A-Z2-9]{6}$/.test(r1.rows[0].booking_reference), "create_booking returns reference", r1.rows[0].booking_reference);

await expectError(`select * from create_booking($1,$2,$3::date,'09:00','B','C','b@example.com','+33600000000','beginner',1,null)`, [ids.private, ids.central, monday], "slot_unavailable", "same slot rejected");
await expectError(`select * from create_booking($1,$2,$3::date,'08:30','B','C','b@example.com','+33600000000','beginner',1,null)`, [ids.comp, ids.river, monday], "slot_unavailable", "overlapping slot at another location rejected (one coach)");

s = await slots(ids.private, ids.river);
ok(!s.includes("08:30") && !s.includes("09:00") && !s.includes("09:30") && s.includes("08:00") && s.includes("10:00"), "booked time removed from all locations", s.join(","));

// Exclusion constraint as the last line of defence (direct insert bypassing the function)
await expectError(
  `insert into bookings (reference, first_name, last_name, email, phone, player_level, service_id, location_id, booking_date, start_time, end_time, service_name, location_name, duration_min, price_cents, currency)
   values ('SSK-DIRECT','X','Y','x@example.com','+33600000000','beginner',$1,$2,$3::date,'09:30','10:30','P','L',60,100,'EUR')`,
  [ids.private, ids.central, monday], "bookings_no_overlap", "exclusion constraint blocks overlapping insert");

await expectError(`select * from create_booking($1,$2,$3::date,'10:00','B','C','b@example.com','+33600000000','beginner',1,null)`, [ids.grp, ids.central, monday], "invalid_players", "group needs 3-4 players");
const g = await book(ids.grp, ids.central, "10:00", "grp@example.com", 4);
const price = (await db.query(`select price_cents, end_time::text from bookings where reference=$1`, [g.rows[0].booking_reference])).rows[0];
ok(price.price_cents === 12000 && price.end_time === "11:30:00", "per-player price snapshot + end time", JSON.stringify(price));

// Rate limit (3 pending per email / 24h)
await book(ids.private, ids.central, "16:00", "spam@example.com");
await book(ids.private, ids.central, "17:00", "spam@example.com");
await book(ids.private, ids.central, "18:00", "spam@example.com");
await expectError(`select * from create_booking($1,$2,$3::date,'19:00','S','P','SPAM@example.com','+33600000000','beginner',1,null)`, [ids.private, ids.central, monday], "rate_limited", "rate limit per email (case-insensitive)");

// Cancelling frees the slot
await db.query(`update bookings set status='cancelled' where reference=$1`, [r1.rows[0].booking_reference]);
ok((await slots(ids.private, ids.central)).includes("09:00"), "cancelled booking frees the slot");
const ev = (await db.query(`select from_status, to_status from booking_events e join bookings b on b.id=e.booking_id where b.reference=$1 order by e.created_at`, [r1.rows[0].booking_reference])).rows;
ok(ev.length === 2 && ev[1].from_status === "pending" && ev[1].to_status === "cancelled", "status history logged", JSON.stringify(ev));
const ts = (await db.query(`select cancelled_at is not null c from bookings where reference=$1`, [r1.rows[0].booking_reference])).rows[0];
ok(ts.c, "cancelled_at timestamp set");

// Blocks
const tue = (await db.query(`select ($1::date + 1)::text d`, [monday])).rows[0].d;
await db.query(`insert into blocked_dates (date_from, date_to) values ($1::date, $1::date)`, [tue]);
ok((await slots(ids.private, ids.central, tue)).length === 0, "whole-day block removes all slots");
const wed = (await db.query(`select ($1::date + 2)::text d`, [monday])).rows[0].d;
await db.query(`insert into blocked_dates (date_from, date_to, start_time, end_time) values ($1::date, $1::date, '10:00', '12:00')`, [wed]);
s = await slots(ids.private, ids.central, wed);
ok(s.includes("09:00") && !s.includes("09:30") && !s.includes("10:00") && s.includes("16:00"), "partial block removes overlapping slots", s.join(","));

// Buffer
await db.exec(`update coach_settings set buffer_min = 30`);
s = await slots(ids.private, ids.central);
ok(!s.includes("11:00") && s.includes("08:00"), "buffer around bookings (group 10:00-11:30 blocks 11:00 with 30min buffer... window ends 12:00)", s.join(","));
await db.exec(`update coach_settings set buffer_min = 0`);

// Dates function
const dates = (await db.query(`select d::text from get_available_dates($1,$2,$3::date,$3::date + 6) d`, [ids.private, ids.central, monday])).rows.map((r) => r.d);
ok(!dates.includes(tue) && dates.includes(monday) && dates.length === 5, "get_available_dates skips blocked day and Sunday", dates.join(","));

// Past dates / booking window
ok((await slots(ids.private, ids.central, "2020-01-06")).length === 0, "past dates have no slots");

// Summary (no PII)
const sum = (await db.query(`select * from get_booking_summary($1)`, [g.rows[0].booking_reference.toLowerCase()])).rows[0];
ok(sum && sum.service_name === "Group Training" && !("email" in sum), "public summary works, no PII");

// ---- RLS as anon -----------------------------------------------------------
await db.exec(`set role anon`);
const anonBookings = await db.query(`select count(*)::int n from bookings`);
ok(anonBookings.rows[0].n === 0, "anon cannot read bookings");
await db.exec(`reset role`);
await db.exec(`update services set is_active=false where slug='padel-coaching'`);
await db.exec(`set role anon`);
const anonServices = await db.query(`select count(*)::int n from services`);
ok(anonServices.rows[0].n === 5, "anon sees only active services", anonServices.rows[0].n);
const upd = await db.query(`update services set price_cents = 1 returning id`).catch((e) => ({ rows: [], err: e }));
ok(upd.rows.length === 0, "anon update affects 0 rows");
await expectError(`insert into bookings (reference, first_name, last_name, email, phone, player_level, service_id, location_id, booking_date, start_time, end_time, service_name, location_name, duration_min, price_cents, currency) values ('SSK-ANON','X','Y','x@example.com','+33600000000','beginner',$1,$2,$3::date,'19:00','20:00','P','L',60,100,'EUR')`, [ids.private, ids.central, monday], "row-level security", "anon cannot insert bookings directly");
const viaFn = await db.query(`select * from create_booking($1,$2,$3::date,'19:00','Anon','User','anon@example.com','+33600000000','beginner',1,null)`, [ids.private, ids.central, monday]).then(() => true).catch((e) => e.message);
ok(viaFn === true, "anon CAN book through create_booking()", viaFn);
await db.query(`insert into contact_messages (name, email, message) values ('A','a@example.com','Hello there coach')`).then(() => ok(true, "anon can submit contact message")).catch((e) => ok(false, "anon can submit contact message", e.message));
ok((await db.query(`select count(*)::int n from contact_messages`)).rows[0].n === 0, "anon cannot read contact messages");
await expectError(`select generate_reference(6)`, [], "permission denied", "anon cannot call internal generate_reference");
await db.exec(`reset role`);

// ---- RLS as admin -----------------------------------------------------------
await db.exec(`insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'coach@example.com')`);
ok((await db.query(`select role from profiles where id='11111111-1111-1111-1111-111111111111'`)).rows[0]?.role === "player", "profile auto-created on signup");
await db.exec(`update profiles set role='admin' where id='11111111-1111-1111-1111-111111111111'`);
await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';`);
ok((await db.query(`select is_admin() a`)).rows[0].a === true, "is_admin() true for admin");
ok((await db.query(`select count(*)::int n from bookings`)).rows[0].n > 0, "admin reads bookings");
const conflict = await db.query(`update bookings set status='pending' where reference=$1`, [r1.rows[0].booking_reference]).then(() => "ok").catch((e) => e.code);
ok(conflict === "ok", "admin can reopen cancelled booking when slot is free");
await db.exec(`reset role; set request.jwt.claim.sub = '';`);

// Non-admin authenticated user
await db.exec(`insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'player@example.com')`);
await db.exec(`set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';`);
ok((await db.query(`select count(*)::int n from bookings`)).rows[0].n === 0, "signed-in non-admin cannot read bookings");
await db.exec(`reset role`);

// ---- Coach-created lessons (migration 2) --------------------------------------
await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';`);
const series = (await db.query(`insert into booking_series (frequency, interval_count, starts_on, occurrences) values ('weekly', 1, $1::date, 2) returning id, created_by`, [monday])).rows[0];
ok(series.created_by === "11111111-1111-1111-1111-111111111111", "admin creates a series (created_by = auth.uid())");
const adminInsert = (time, date = monday) =>
  db.query(
    `insert into bookings (reference, first_name, last_name, email, phone, player_level, service_id, location_id, booking_date, start_time, end_time,
       service_name, location_name, duration_min, price_cents, currency, status, source, series_id, confirmed_at)
     values ('SSK-' || substr(md5(random()::text), 1, 6), 'Coach', 'Lesson', null, null, 'advanced', $1, $2, $3::date, $4::time, ($4::time + interval '1 hour')::time,
       'Private', 'Central', 60, 6000, 'EUR', 'confirmed', 'admin', $5, now()) returning id`,
    [ids.private, ids.central, date, time, series.id],
  );
await adminInsert("14:00").then(() => ok(true, "admin lesson without email/phone allowed")).catch((e) => ok(false, "admin lesson without email/phone allowed", e.message));
await adminInsert("14:30").then(() => ok(false, "admin lesson overlap rejected", "(no error)")).catch((e) => ok(e.code === "23P01", "admin lesson overlap rejected", e.code));
ok((await db.query(`select count(*)::int n from bookings where series_id = $1`, [series.id])).rows[0].n === 1, "lesson linked to its series");
await db.exec(`reset role; set request.jwt.claim.sub = '';`);
await db
  .query(
    `insert into bookings (reference, first_name, last_name, email, phone, player_level, service_id, location_id, booking_date, start_time, end_time, service_name, location_name, duration_min, price_cents, currency)
     values ('SSK-NOMAIL','W','B',null,null,'beginner',$1,$2,$3::date,'21:00','22:00','P','L',60,100,'EUR')`,
    [ids.private, ids.central, monday],
  )
  .then(() => ok(false, "web bookings still require email + phone", "(no error)"))
  .catch((e) => ok(String(e.message).includes("bookings_contact_required"), "web bookings still require email + phone", e.message));
await db.exec(`set role anon`);
ok((await db.query(`select count(*)::int n from booking_series`)).rows[0].n === 0, "anon cannot read series");
await db.exec(`reset role`);

// ---- Journey posts (migration 3) ----------------------------------------------
ok((await db.query(`select public from storage.buckets where id = 'journey'`)).rows[0]?.public === true, "public 'journey' storage bucket created");
await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';`);
await db.query(`insert into journey_posts (kind, title, image_url, player_name, event_name, result) values ('achievement', 'Regional champion', '/images/x.jpg', 'Lina', 'Regional U14', 'Winner')`);
await db.query(`insert into journey_posts (title, image_url, is_published) values ('Draft post', '/images/y.jpg', false)`);
ok((await db.query(`select count(*)::int n from journey_posts`)).rows[0].n === 2, "admin manages journey posts (incl. drafts)");
await db.query(`insert into storage.objects (bucket_id, name) values ('journey', 'a.jpg')`).then(() => ok(true, "admin can upload journey images")).catch((e) => ok(false, "admin can upload journey images", e.message));
await db.exec(`reset role; set request.jwt.claim.sub = '';`);
await db.exec(`set role anon`);
ok((await db.query(`select count(*)::int n from journey_posts`)).rows[0].n === 1, "public sees only published posts");
await db
  .query(`insert into journey_posts (title, image_url) values ('Spam', '/x.jpg')`)
  .then(() => ok(false, "anon cannot create posts", "(no error)"))
  .catch((e) => ok(String(e.message).includes("row-level security"), "anon cannot create posts", e.message));
await db
  .query(`insert into storage.objects (bucket_id, name) values ('journey', 'evil.jpg')`)
  .then(() => ok(false, "anon cannot upload images", "(no error)"))
  .catch((e) => ok(String(e.message).includes("row-level security"), "anon cannot upload images", e.message));
await db.exec(`reset role`);

// ---- Lesson packs (migration 4) -----------------------------------------------
const packs = (await db.query(`select id, lessons_count, discount_percent from packages order by lessons_count`)).rows;
ok(packs.length === 2 && packs[0].discount_percent === 5 && packs[1].discount_percent === 10, "seeded packs: 5 × −5%, 10 × −10%");
ok((await db.query(`select currency from coach_settings`)).rows[0].currency === "USD", "currency is USD");
const thu = (await db.query(`select ($1::date + 3)::text d`, [monday])).rows[0].d;
const packBooking = await db.query(
  `select * from create_booking($1,$2,$3::date,'08:00','Pack','Buyer','pack@example.com','+15550000000','advanced',1,null,$4)`,
  [ids.private, ids.central, thu, packs[1].id],
);
const pb = (await db.query(`select price_cents, package_name, package_lessons, package_total_cents from bookings where reference = $1`, [packBooking.rows[0].booking_reference])).rows[0];
ok(pb.price_cents === 5400 && pb.package_total_cents === 54000 && pb.package_lessons === 10, "pack booking: $54/lesson, $540 total (10 × −10%)", JSON.stringify(pb));
const packSummary = (await db.query(`select package_name, package_total_cents from get_booking_summary($1)`, [packBooking.rows[0].booking_reference])).rows[0];
ok(packSummary.package_total_cents === 54000, "booking summary includes the pack");
const noPack = await db.query(`select * from create_booking($1,$2,$3::date,'09:00','No','Pack','nopack@example.com','+15550000000','advanced',1,null)`, [ids.private, ids.central, thu]);
ok((await db.query(`select price_cents, package_id from bookings where reference = $1`, [noPack.rows[0].booking_reference])).rows[0].price_cents === 6000, "single lesson keeps full price (old 11-arg call still works)");
await db.exec(`update packages set is_active = false where id = '${packs[0].id}'`);
await expectError(
  `select * from create_booking($1,$2,$3::date,'10:00','X','Y','x2@example.com','+15550000000','advanced',1,null,$4)`,
  [ids.private, ids.central, thu, packs[0].id],
  "package_unavailable",
  "inactive pack rejected",
);
await db.exec(`set role anon`);
ok((await db.query(`select count(*)::int n from packages`)).rows[0].n === 1, "public sees only active packs");
await db
  .query(`update packages set discount_percent = 90 returning id`)
  .then((r) => ok(r.rows.length === 0, "anon cannot change packs"))
  .catch(() => ok(true, "anon cannot change packs"));
await db.exec(`reset role`);

// ---- French version (migration 5) ---------------------------------------------
ok((await db.query(`select name_fr from services where slug = 'private-lesson'`)).rows[0].name_fr === "Cours de tennis particulier", "seeded French service names");
const frBooking = await db.query(
  `select * from create_booking($1,$2,$3::date,'16:00','Amel','B','amel@example.com','+21620000000','beginner',1,null,null,'fr')`,
  [ids.private, ids.central, thu],
);
ok((await db.query(`select locale from bookings where reference = $1`, [frBooking.rows[0].booking_reference])).rows[0].locale === "fr", "booking stores the player's language");
const weird = await db.query(`select * from create_booking($1,$2,$3::date,'17:00','X','Y','x3@example.com','+21620000000','beginner',1,null,null,'de')`, [ids.private, ids.central, thu]);
ok((await db.query(`select locale from bookings where reference = $1`, [weird.rows[0].booking_reference])).rows[0].locale === "en", "unknown language falls back to English");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
