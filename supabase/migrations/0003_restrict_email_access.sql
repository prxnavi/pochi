-- Run this in the Supabase SQL editor to close a gap where any signed-in
-- user could read any other user's email directly from public.users, not
-- just a trade partner's after acceptance (see supabase/schema.sql for the
-- full, current schema — this file only carries the incremental change).
--
-- What changes:
--   1. authenticated's column access to public.users is narrowed to
--      (id, username, created_at) — same treatment anon already got in
--      migration 0002. Email is no longer readable off the base table by
--      anyone but the row owner writing their own profile.
--   2. A new view, trade_partner_emails, is the only remaining way to read
--      someone else's email — it only returns a row for users who share an
--      accepted trade with the caller.
--   3. app/trades/page.tsx needs to query trade_partner_emails instead of
--      users for the accepted-trade email reveal (already updated in code).

revoke select on public.users from authenticated;
grant select (id, username, created_at) on public.users to authenticated;

create view public.trade_partner_emails as
select u.id, u.email
from public.users u
where exists (
  select 1 from public.trades t
  where t.status = 'accepted'
    and (
      (t.proposer_id = auth.uid() and t.receiver_id = u.id)
      or (t.receiver_id = auth.uid() and t.proposer_id = u.id)
    )
);

grant select on public.trade_partner_emails to authenticated;
