-- =============================================================================
-- Journey: achievements, photos and news posted by the coach.
-- Shown on the homepage ("Follow the journey") and on /journey.
-- Images live in the public Storage bucket "journey"; only admins can upload.
-- =============================================================================

create table public.journey_posts (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'photo' check (kind in ('achievement', 'photo', 'news')),
  title         text not null check (char_length(title) between 2 and 140),
  body          text check (char_length(body) <= 1500),
  image_url     text not null check (char_length(image_url) between 1 and 1000),
  image_alt     text not null default '' check (char_length(image_alt) <= 300),
  player_name   text check (char_length(player_name) <= 120),
  event_name    text check (char_length(event_name) <= 160),
  result        text check (char_length(result) <= 120),
  happened_on   date not null default current_date,
  is_published  boolean not null default true,
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index journey_posts_listing_idx on public.journey_posts (is_published, is_featured desc, happened_on desc);

create trigger journey_posts_updated_at before update on public.journey_posts
  for each row execute function public.set_updated_at();

alter table public.journey_posts enable row level security;

create policy "journey_public_read" on public.journey_posts
  for select using (is_published or public.is_admin());
create policy "journey_admin_all" on public.journey_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage bucket for journey images (public read, admin write)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('journey', 'journey', true)
on conflict (id) do nothing;

create policy "journey_images_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'journey' and public.is_admin());
create policy "journey_images_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'journey' and public.is_admin());
create policy "journey_images_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'journey' and public.is_admin());
