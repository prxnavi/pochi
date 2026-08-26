"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/types/database";

const statusStyle: Record<string, string> = {
  proposed: "bg-lavender",
  accepted: "bg-mint",
  declined: "bg-box-pink",
};

export default function TradeCard({ trade, myId }: { trade: Trade; myId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const isReceiver = trade.receiver_id === myId;
  const otherUser = isReceiver ? trade.proposer : trade.receiver;

  const myItem = trade.trade_items?.find((i) => i.offered_by === myId);
  const theirItem = trade.trade_items?.find((i) => i.offered_by !== myId);

  async function updateStatus(status: "accepted" | "declined") {
    setLoading(true);
    setError(null);

    // trade + listing status flip together in one transaction (see
    // respond_to_trade in supabase/schema.sql) so a partial failure can't
    // leave the trade accepted with listings still marked available.
    const { error: rpcError } = await supabase.rpc("respond_to_trade", {
      trade_id: trade.id,
      new_status: status,
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-2xl border-2 border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-bold text-ink">
          {isReceiver ? "proposed by" : "sent to"} {otherUser?.username ?? "a collector"}
        </p>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle[trade.status]}`}>
          {trade.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold text-ink-soft mb-1">you offer</p>
          <div className="rounded-xl bg-ink/5 p-2 flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0">
              {myItem?.listings?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={myItem.listings.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <p className="text-xs font-semibold truncate">{myItem?.listings?.figure_name}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-ink-soft mb-1">you get</p>
          <div className="rounded-xl bg-ink/5 p-2 flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0">
              {theirItem?.listings?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={theirItem.listings.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <p className="text-xs font-semibold truncate">{theirItem?.listings?.figure_name}</p>
          </div>
        </div>
      </div>

      {trade.status === "accepted" && (
        <p className="mt-3 text-xs font-bold text-ink-soft">
          reach out to {otherUser?.username} at{" "}
          <a href={`mailto:${otherUser?.email}`} className="underline text-ink">
            {otherUser?.email}
          </a>{" "}
          to sort out shipping.
        </p>
      )}

      {isReceiver && trade.status === "proposed" && (
        <div className="mt-3">
          {error && <p className="text-xs font-semibold text-box-pink-deep mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus("accepted")}
              disabled={loading}
              className="flex-1 bg-ink text-cream font-bold rounded-full py-2 text-sm hover:bg-box-pink-deep transition-colors disabled:opacity-50"
            >
              accept
            </button>
            <button
              onClick={() => updateStatus("declined")}
              disabled={loading}
              className="flex-1 border-2 border-ink/15 font-bold rounded-full py-2 text-sm hover:border-box-pink-deep transition-colors disabled:opacity-50"
            >
              decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
