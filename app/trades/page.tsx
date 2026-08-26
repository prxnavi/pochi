import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TradeCard from "@/components/TradeCard";
import type { Trade } from "@/types/database";

export default async function TradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Username only here — email is intentionally left out of this query.
  // Both sides are meant to see each other's email only once a trade is
  // accepted (see README), so it's fetched separately below and merged in
  // only for accepted trades instead of shipping it to the client for
  // every proposed/declined trade too.
  const { data: trades } = await supabase
    .from("trades")
    .select(
      "*, proposer:proposer_id(username), receiver:receiver_id(username), trade_items(*, listings(*))"
    )
    .or(`proposer_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const acceptedTrades = (trades ?? []).filter((t) => t.status === "accepted");
  if (acceptedTrades.length > 0) {
    const partnerIds = acceptedTrades.map((t) =>
      t.proposer_id === user.id ? t.receiver_id : t.proposer_id
    );
    const { data: emails } = await supabase
      .from("users")
      .select("id, email")
      .in("id", partnerIds);
    const emailById = new Map((emails ?? []).map((u) => [u.id, u.email]));

    for (const t of acceptedTrades) {
      const partnerId = t.proposer_id === user.id ? t.receiver_id : t.proposer_id;
      const email = emailById.get(partnerId);
      if (t.proposer_id === partnerId && t.proposer) t.proposer.email = email;
      if (t.receiver_id === partnerId && t.receiver) t.receiver.email = email;
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">my trades</h1>
      <p className="text-ink-soft font-semibold mb-8">
        proposals you&apos;ve sent and received.
      </p>

      {trades && trades.length > 0 ? (
        <div className="flex flex-col gap-4">
          {(trades as unknown as Trade[]).map((trade) => (
            <TradeCard key={trade.id} trade={trade} myId={user.id} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="font-display text-2xl text-ink/40 mb-2">no trades yet</p>
          <p className="text-ink-soft font-semibold">
            browse the shelf and propose your first trade.
          </p>
        </div>
      )}
    </div>
  );
}
