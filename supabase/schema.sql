-- Pochi MVP schema
-- Run this in the Supabase SQL editor for your project.

-- 1. users (profile table, mirrors auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  created_at timestamptz not null default now()
);

-- 2. listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  figure_name text not null,
  series text,
  condition text not null check (condition in ('mint', 'opened', 'loose')),
  photo_url text,
  status text not null default 'available' check (status in ('available', 'traded')),
  created_at timestamptz not null default now()
);

-- 3. trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- 4. trade_items (links listings offered by each side to a trade)
create table public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  offered_by uuid not null references public.users(id) on delete cascade
);

-- Indexes
create index listings_status_idx on public.listings(status);
create index listings_user_idx on public.listings(user_id);
create index trades_proposer_idx on public.trades(proposer_id);
create index trades_receiver_idx on public.trades(receiver_id);
create index trade_items_trade_idx on public.trade_items(trade_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;

-- users: anyone signed in can read profiles (needed to show usernames), only self can update
create policy "users are readable by anyone signed in"
  on public.users for select
  using (auth.role() = 'authenticated');

create policy "users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- listings: readable by anyone signed in, writable only by owner
create policy "listings are readable by anyone signed in"
  on public.listings for select
  using (auth.role() = 'authenticated');

create policy "users can insert own listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "users can update own listings"
  on public.listings for update
  using (auth.uid() = user_id);

create policy "users can delete own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- trades: only proposer or receiver can see/update
create policy "trades are readable by participants"
  on public.trades for select
  using (auth.uid() = proposer_id or auth.uid() = receiver_id);

create policy "users can propose trades"
  on public.trades for insert
  with check (auth.uid() = proposer_id);

-- direct updates are receiver-only; accepting also flips listing status,
-- which must happen atomically, so real accept/decline goes through the
-- respond_to_trade() function below instead of a bare table update.
create policy "receiver can update trade status"
  on public.trades for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- trade_items: readable/writable by trade participants
create policy "trade items are readable by trade participants"
  on public.trade_items for select
  using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id
      and (t.proposer_id = auth.uid() or t.receiver_id = auth.uid())
    )
  );

create policy "trade participants can insert trade items"
  on public.trade_items for insert
  with check (
    exists (
      select 1 from public.trades t
      where t.id = trade_id
      and (t.proposer_id = auth.uid() or t.receiver_id = auth.uid())
    )
  );

-- Storage bucket for listing photos (run once)
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "anyone signed in can upload listing photos"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');

create policy "listing photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

-- Atomic trade actions ------------------------------------------------
-- Both functions run as security definer so they can make their writes
-- inside one transaction. Authorization is enforced in the function body
-- (not by RLS), which is why the grants below are scoped to `authenticated`
-- rather than left wide open.

-- Re-checks that both listings are still available and that the caller
-- owns the offered one, then creates the trade + trade_items atomically.
-- Without this, a client could insert trade rows against a listing that
-- was traded away moments earlier (a check-then-insert race).
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

-- Accepts or declines a trade and, on acceptance, flips both listings to
-- 'traded' in the same transaction — so a failure partway through can't
-- leave the trade accepted with listings still marked available. Only the
-- receiver may call this, and only while the trade is still 'proposed'.
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
