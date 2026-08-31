"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);

    // Block deleting a listing that's tied up in a still-open trade
    // proposal — the trade_items row would cascade-delete along with it,
    // silently leaving the other side's trade record with only one item.
    const { data: pending } = await supabase
      .from("trade_items")
      .select("trade_id, trades!inner(status)")
      .eq("listing_id", listingId)
      .eq("trades.status", "proposed")
      .limit(1);

    if (pending && pending.length > 0) {
      setLoading(false);
      setError('this listing has a pending trade proposal — decline it from "my trades" before deleting.');
      return;
    }

    const { error: deleteError } = await supabase.from("listings").delete().eq("id", listingId);

    setLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="mt-8 rounded-2xl border-2 border-dashed border-box-pink-deep/40 bg-box-pink/10 p-4">
        <p className="text-sm font-semibold text-ink mb-3">delete this listing? this can&apos;t be undone.</p>
        {error && <p className="text-sm font-semibold text-box-pink-deep mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-box-pink-deep text-cream font-bold rounded-full px-5 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "deleting..." : "yes, delete it"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={loading}
            className="border-2 border-ink/15 font-bold rounded-full px-5 py-2 text-sm hover:border-box-pink-deep transition-colors"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="mt-8 text-sm font-bold text-ink-soft hover:text-box-pink-deep transition-colors underline"
    >
      delete this listing
    </button>
  );
}
