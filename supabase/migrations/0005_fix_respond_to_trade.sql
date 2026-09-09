-- Run this in the Supabase SQL editor to fix a bug in respond_to_trade():
-- accepting a trade failed with "column reference \"trade_id\" is
-- ambiguous", because the function's own parameter was named trade_id,
-- colliding with the trade_items.trade_id column referenced deeper in the
-- function body. Declining never hit the broken line, which is why only
-- acceptance failed. Renaming the parameter to p_trade_id removes the
-- collision; the function's behavior is otherwise unchanged.

create or replace function public.respond_to_trade(p_trade_id uuid, new_status text)
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

  select * into t from public.trades where id = p_trade_id for update;
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
