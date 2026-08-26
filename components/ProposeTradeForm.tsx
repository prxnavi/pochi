"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/types/database";

export default function ProposeTradeForm({
  targetListing,
  myListings,
}: {
  targetListing: Listing;
  myListings: Listing[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  async function propose() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    // Creates the trade + both trade_items in one transaction, re-checking
    // that both listings are still available (see propose_trade in
    // supabase/schema.sql) instead of trusting the stale status this page
    // was rendered with.
    const { error: rpcError } = await supabase.rpc("propose_trade", {
      target_listing_id: targetListing.id,
      offered_listing_id: selected,
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="mt-6 rounded-2xl bg-mint/30 border-2 border-mint p-4 font-semibold text-sm">
        trade proposed. check{" "}
        <Link href="/trades" className="underline font-bold">
          my trades
        </Link>{" "}
        for updates.
      </div>
    );
  }

  if (myListings.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-box-pink/10 border-2 border-dashed border-box-pink-deep/40 p-4 font-semibold text-sm">
        you need at least one available listing of your own to propose a trade.{" "}
        <Link href="/listings/new" className="underline font-bold">
          list one now
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="font-display font-bold text-lg text-ink mb-3">propose a trade</p>
      <p className="text-sm text-ink-soft font-semibold mb-3">
        pick one of your figures to offer for this one.
      </p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {myListings.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelected(l.id)}
            className={`rounded-xl border-2 p-2 text-left transition-colors ${
              selected === l.id ? "border-box-pink-deep bg-box-pink/20" : "border-ink/10 bg-white"
            }`}
          >
            <div className="aspect-square rounded-lg bg-ink/5 overflow-hidden mb-1">
              {l.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.photo_url} alt={l.figure_name} className="w-full h-full object-cover" />
              )}
            </div>
            <p className="text-xs font-bold truncate">{l.figure_name}</p>
          </button>
        ))}
      </div>
      {error && <p className="text-sm font-semibold text-box-pink-deep mb-2">{error}</p>}
      <button
        onClick={propose}
        disabled={!selected || loading}
        className="bg-ink text-cream font-bold rounded-full px-6 py-2.5 hover:bg-box-pink-deep transition-colors disabled:opacity-40"
      >
        {loading ? "proposing..." : "send trade proposal"}
      </button>
    </div>
  );
}
