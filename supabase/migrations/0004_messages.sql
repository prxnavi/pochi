-- Run this in the Supabase SQL editor to add per-trade chat, unlocked once
-- a trade is accepted (see supabase/schema.sql for the full, current
-- schema — this file only carries the incremental change).

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index messages_trade_idx on public.messages(trade_id, created_at);

alter table public.messages enable row level security;

-- participants can always read the thread; sending requires the trade to
-- actually be accepted, which is what "unlocks" chat
create policy "trade participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id
      and (t.proposer_id = auth.uid() or t.receiver_id = auth.uid())
    )
  );

create policy "trade participants can send messages once accepted"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.trades t
      where t.id = trade_id
      and t.status = 'accepted'
      and (t.proposer_id = auth.uid() or t.receiver_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.messages;
