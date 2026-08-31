import { createClient } from "@/lib/supabase/server";
import ProposeTradeForm from "@/components/ProposeTradeForm";
import DeleteListingButton from "@/components/DeleteListingButton";
import type { Condition, Listing } from "@/types/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { conditionLabel } from "@/lib/constants";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, users(username)")
    .eq("id", id)
    .single();

  if (!listing) notFound();

  const isOwner = user?.id === listing.user_id;

  let myListings: Listing[] = [];
  if (user && !isOwner) {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "available");
    myListings = (data as Listing[]) ?? [];
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="grid sm:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl bg-white border-2 border-ink/10 overflow-hidden">
          {listing.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.photo_url}
              alt={listing.figure_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-5xl text-ink/20">?</span>
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display font-extrabold text-2xl text-ink">
            {listing.figure_name}
          </h1>
          {listing.series && (
            <p className="text-ink-soft font-semibold mt-0.5">{listing.series}</p>
          )}
          <span className="inline-block mt-3 text-xs font-bold px-2.5 py-1 rounded-full bg-lavender">
            {conditionLabel[listing.condition as Condition]}
          </span>
          <p className="mt-4 text-sm font-semibold text-ink-soft">
            listed by{" "}
            <span className="text-ink">{listing.users?.username ?? "a collector"}</span>
          </p>
          {listing.status === "traded" && (
            <p className="mt-3 text-sm font-bold text-box-pink-deep">already traded</p>
          )}
        </div>
      </div>

      {!isOwner && user && listing.status === "available" && (
        <ProposeTradeForm targetListing={listing as Listing} myListings={myListings} />
      )}

      {!user && (
        <p className="mt-8 text-sm font-semibold text-ink-soft">
          <Link href="/login" className="underline font-bold text-ink">
            sign in
          </Link>{" "}
          to propose a trade for this figure.
        </p>
      )}

      {isOwner && (
        <>
          <p className="mt-8 text-sm font-semibold text-ink-soft">this is your listing.</p>
          {listing.status === "available" && <DeleteListingButton listingId={listing.id} />}
        </>
      )}
    </div>
  );
}
