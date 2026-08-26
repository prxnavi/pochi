-- Run this in the Supabase SQL editor against an already-provisioned Pochi
-- project to pick up the atomic trade RPCs (see supabase/schema.sql for the
-- full, current schema — this file only carries the incremental change).
--
-- What changes:
--   1. Direct updates to public.trades are now receiver-only (previously
--      either party could update the status column directly).
--   2. Two new functions, propose_trade() and respond_to_trade(), do the
--      multi-table writes (trade + trade_items, or trade + listings) in a
--      single transaction instead of two separate client round-trips.

drop policy if exists "receiver can update trade status" on public.trades;

create policy "receiver can update trade status"
  on public.trades for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

create or replace function public.propose_trade(target_listing_id uuid, offered_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
  offered record;
  new_trade_id uuid;
begin
  select * into target from public.listings where id = target_listing_id for update;
  if not found or target.status <> 'available' then
    raise exception 'that listing is no longer available';
  end if;

  select * into offered from public.listings where id = offered_listing_id for update;
  if not found or offered.status <> 'available' then
    raise exception 'your offered listing is no longer available';
  end if;

  if offered.user_id <> auth.uid() then
    raise exception 'you can only offer your own listings';
  end if;

  if target.user_id = auth.uid() then
    raise exception 'you cannot propose a trade for your own listing';
  end if;

  insert into public.trades (proposer_id, receiver_id, status)
  values (auth.uid(), target.user_id, 'proposed')
  returning id into new_trade_id;

  insert into public.trade_items (trade_id, listing_id, offered_by)
  values
    (new_trade_id, target.id, target.user_id),
    (new_trade_id, offered.id, auth.uid());

  return new_trade_id;
end;
$$;

grant execute on function public.propose_trade(uuid, uuid) to authenticated;

create or replace function public.respond_to_trade(trade_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  if new_status not in ('accepted', 'declined') then
    raise exception 'invalid status';
  end if;

  select * into t from public.trades where id = trade_id for update;
  if not found then
    raise exception 'trade not found';
  end if;

  if t.receiver_id <> auth.uid() then
    raise exception 'only the receiver can respond to this trade';
  end if;

  if t.status <> 'proposed' then
    raise exception 'this trade has already been resolved';
  end if;

  update public.trades set status = new_status where id = t.id;

  if new_status = 'accepted' then
    update public.listings
    set status = 'traded'
    where id in (select listing_id from public.trade_items where trade_id = t.id);
  end if;
end;
$$;

grant execute on function public.respond_to_trade(uuid, text) to authenticated;
