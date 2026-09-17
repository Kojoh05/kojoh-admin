-- ============================================================
-- KOJOH ADMIN PORTAL, database foundation
-- Safe to run more than once. Run this whole file in one go.
--
-- What it does:
--   1. Adds an admin flag and an is_admin() helper
--   2. Adds last_seen so the dashboard can count active users
--   3. Adds publish flags so anything can be hidden in one click
--   4. Adds image, colour and SEO fields for folders and datasets
--   5. Adds a search_log table for the top search terms panel
--   6. Rewrites public read policies so hidden rows stay hidden,
--      while buyers keep access to what they already paid for
--   7. Gives admins full read and write across content and analytics
--   8. Sets up a public images bucket and admin upload rights
--   9. Adds admin_dashboard(), one call that returns every metric
-- ============================================================


-- ------------------------------------------------------------
-- 1. Admin flag and helper
-- ------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists last_seen timestamptz;

-- security definer so it can read profiles without tripping over
-- the policies that are themselves about to call it
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;


-- ------------------------------------------------------------
-- 2. Publish flags, presentation and SEO fields
-- ------------------------------------------------------------
alter table public.folders  add column if not exists is_published boolean not null default true;
alter table public.folders  add column if not exists color_hex text;
alter table public.folders  add column if not exists icon_url text;
alter table public.folders  add column if not exists seo_title text;
alter table public.folders  add column if not exists seo_description text;
alter table public.folders  add column if not exists seo_keywords text;
alter table public.folders  add column if not exists og_image_url text;

alter table public.datasets add column if not exists is_published boolean not null default true;
alter table public.datasets add column if not exists sort_order int not null default 0;
alter table public.datasets add column if not exists hero_image_url text;
alter table public.datasets add column if not exists card_image_url text;
alter table public.datasets add column if not exists seo_title text;
alter table public.datasets add column if not exists seo_description text;
alter table public.datasets add column if not exists seo_keywords text;
alter table public.datasets add column if not exists og_image_url text;
alter table public.datasets add column if not exists canonical_url text;


-- ------------------------------------------------------------
-- 3. Search log, feeds the top search terms panel
-- ------------------------------------------------------------
create table if not exists public.search_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  results_count int,
  created_at timestamptz not null default now()
);

create index if not exists search_log_created_idx on public.search_log (created_at desc);
create index if not exists search_log_query_idx on public.search_log (lower(query));

alter table public.search_log enable row level security;

drop policy if exists "Anyone can log a search" on public.search_log;
create policy "Anyone can log a search"
  on public.search_log for insert
  with check (
    query is not null
    and length(query) between 1 and 120
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "Admins read search log" on public.search_log;
create policy "Admins read search log"
  on public.search_log for select using (public.is_admin());


-- ------------------------------------------------------------
-- 4. Last seen, called by the main site on page load
-- ------------------------------------------------------------
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.profiles set last_seen = now() where id = auth.uid();
$fn$;

revoke all on function public.touch_last_seen() from public;
grant execute on function public.touch_last_seen() to authenticated;


-- ------------------------------------------------------------
-- 5. Public reads respect the publish flag.
--    A buyer keeps access to a dataset they already paid for even
--    after it is hidden from the catalogue.
-- ------------------------------------------------------------
drop policy if exists "Public read folders" on public.folders;
create policy "Public read folders"
  on public.folders for select
  using (is_published or public.is_admin());

drop policy if exists "Public read datasets" on public.datasets;
create policy "Public read datasets"
  on public.datasets for select
  using (
    is_published
    or public.is_admin()
    or exists (
      select 1 from public.purchases pu
      where pu.dataset_id = datasets.id and pu.user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- 6. Admins can manage every content table
-- ------------------------------------------------------------
do $do$
declare t text;
begin
  foreach t in array array[
    'folders','datasets','dataset_schema','dataset_tags','dataset_job_titles',
    'dataset_categories','tags','categories','job_titles','job_title_aliases'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Admins manage ' || t, t);
    execute format(
      'create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      'Admins manage ' || t, t
    );
  end loop;
end
$do$;


-- ------------------------------------------------------------
-- 7. Admins can read the analytics tables
-- ------------------------------------------------------------
do $do$
declare t text;
begin
  foreach t in array array[
    'profiles','purchases','bookmarks','suggestions','app_feedback',
    'profile_job_titles','dataset_licenses'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Admins read ' || t, t);
    execute format(
      'create policy %I on public.%I for select using (public.is_admin())',
      'Admins read ' || t, t
    );
  end loop;
end
$do$;


-- ------------------------------------------------------------
-- 8. Storage. A public images bucket, and admin upload rights on
--    both buckets. The datasets bucket stays private.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "Public read images" on storage.objects;
create policy "Public read images"
  on storage.objects for select using (bucket_id = 'images');

drop policy if exists "Admins upload images" on storage.objects;
create policy "Admins upload images"
  on storage.objects for insert
  with check (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins change images" on storage.objects;
create policy "Admins change images"
  on storage.objects for update
  using (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins remove images" on storage.objects;
create policy "Admins remove images"
  on storage.objects for delete
  using (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins upload dataset files" on storage.objects;
create policy "Admins upload dataset files"
  on storage.objects for insert
  with check (bucket_id = 'datasets' and public.is_admin());

drop policy if exists "Admins change dataset files" on storage.objects;
create policy "Admins change dataset files"
  on storage.objects for update
  using (bucket_id = 'datasets' and public.is_admin());

drop policy if exists "Admins remove dataset files" on storage.objects;
create policy "Admins remove dataset files"
  on storage.objects for delete
  using (bucket_id = 'datasets' and public.is_admin());

drop policy if exists "Admins read dataset files" on storage.objects;
create policy "Admins read dataset files"
  on storage.objects for select
  using (bucket_id = 'datasets' and public.is_admin());


-- ------------------------------------------------------------
-- 9. One call that returns the whole dashboard
-- ------------------------------------------------------------
create or replace function public.admin_dashboard(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  result jsonb;
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  select jsonb_build_object(
    'window_days', p_days,

    'earnings_total',    (select coalesce(sum(price_paid), 0) from purchases),
    'earnings_window',   (select coalesce(sum(price_paid), 0) from purchases where purchased_at >= since),
    'purchases_total',   (select count(*) from purchases),
    'purchases_window',  (select count(*) from purchases where purchased_at >= since),

    'users_total',       (select count(*) from profiles),
    'users_window',      (select count(*) from profiles where created_at >= since),
    'active_7d',         (select count(*) from profiles where last_seen >= now() - interval '7 days'),
    'active_30d',        (select count(*) from profiles where last_seen >= now() - interval '30 days'),

    'datasets_total',     (select count(*) from datasets),
    'datasets_published', (select count(*) from datasets where is_published),
    'folders_total',      (select count(*) from folders),
    'folders_published',  (select count(*) from folders where is_published),

    'licenses_total',   (select count(*) from dataset_licenses),
    'licenses_claimed', (select count(*) from dataset_licenses where claimed_by is not null),

    'suggestions_total',  (select count(*) from suggestions),
    'suggestions_window', (select count(*) from suggestions where created_at >= since),
    'feedback_like',      (select count(*) from app_feedback where vote = 'like'),
    'feedback_dislike',   (select count(*) from app_feedback where vote = 'dislike'),

    'signups_by_day', (
      select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
        select date_trunc('day', created_at)::date as day, count(*)::int as n
        from profiles where created_at >= since group by 1
      ) x
    ),
    'sales_by_day', (
      select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
        select date_trunc('day', purchased_at)::date as day,
               count(*)::int as n,
               coalesce(sum(price_paid), 0) as amount
        from purchases where purchased_at >= since group by 1
      ) x
    ),

    'top_roles', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select jt.name, count(*)::int as n
        from profile_job_titles pjt
        join job_titles jt on jt.id = pjt.job_title_id
        group by jt.name order by n desc limit 8
      ) x
    ),
    'top_bookmarked', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select d.title, d.slug, count(*)::int as n
        from bookmarks b join datasets d on d.id = b.dataset_id
        group by d.title, d.slug order by n desc limit 8
      ) x
    ),
    'top_purchased', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select d.title, d.slug, count(*)::int as n,
               coalesce(sum(p.price_paid), 0) as revenue
        from purchases p join datasets d on d.id = p.dataset_id
        group by d.title, d.slug order by n desc limit 8
      ) x
    ),
    'top_searches', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select lower(trim(query)) as query, count(*)::int as n,
               max(created_at) as last_seen
        from search_log where created_at >= since
        group by 1 order by n desc limit 12
      ) x
    ),
    'empty_searches', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select lower(trim(query)) as query, count(*)::int as n
        from search_log
        where created_at >= since and coalesce(results_count, 0) = 0
        group by 1 order by n desc limit 12
      ) x
    )
  ) into result;

  return result;
end;
$fn$;

revoke all on function public.admin_dashboard(int) from public;
grant execute on function public.admin_dashboard(int) to authenticated;


-- ============================================================
-- LAST STEP, make yourself an admin.
-- Change the email below if you signed up to KOJOH with a different one,
-- then check that it returned 1 row.
-- ============================================================
update public.profiles set is_admin = true where email = 'yashc@inalsa.co.in';

-- Confirm it worked:
--   select username, email, is_admin from public.profiles where is_admin;
