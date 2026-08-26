import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/types/database";

export default async function BrowsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listings } = await supabase
    .from("listings")
    .select("*, users(username)")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink">
          what&apos;s in the box today
        </h1>
        <p className="text-ink-soft font-semibold mt-1">
          browse figures other collectors are ready to trade
        </p>
      </div>

      {!user && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-box-pink-deep/40 bg-box-pink/10 p-4 text-sm font-semibold text-ink">
          sign in to list your own figures and propose trades.
        </div>
      )}

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(listings as Listing[]).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="font-display text-2xl text-ink/40 mb-2">the shelf is empty</p>
          <p className="text-ink-soft font-semibold">
            be the first to list a figure and get things moving.
          </p>
        </div>
      )}
    </div>
  );
}
