-- Run this in the Supabase SQL editor to let signed-out visitors browse
-- listings (see supabase/schema.sql for the full, current schema — this
-- file only carries the incremental change).
--
-- What changes:
--   1. Anyone (no sign-in required) can read listings and usernames.
--   2. The anon role's access to public.users is narrowed to just
--      (id, username, created_at) via column-level grants, so opening the
--      row-level policy doesn't also expose everyone's email address to
--      unauthenticated requests. authenticated requests are unaffected.

drop policy if exists "users are readable by anyone signed in" on public.users;

create policy "usernames are publicly readable"
  on public.users for select
  using (true);

revoke select on public.users from anon;
grant select (id, username, created_at) on public.users to anon;

drop policy if exists "listings are readable by anyone signed in" on public.listings;

create policy "listings are publicly readable"
  on public.listings for select
  using (true);
