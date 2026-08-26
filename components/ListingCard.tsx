import Link from "next/link";
import type { Listing } from "@/types/database";
import { conditionLabel } from "@/lib/constants";

const conditionColor: Record<string, string> = {
  mint: "bg-mint",
  opened: "bg-lavender",
  loose: "bg-box-pink",
};

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="box-card block rounded-2xl border-2 border-ink/10 bg-white overflow-hidden hover:border-box-pink-deep transition-colors"
    >
      <div className="aspect-square bg-ink/5 flex items-center justify-center overflow-hidden">
        {listing.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photo_url}
            alt={listing.figure_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-display text-4xl text-ink/20">?</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display font-bold text-ink truncate">{listing.figure_name}</p>
        {listing.series && (
          <p className="text-xs text-ink-soft font-semibold">{listing.series}</p>
        )}
        <span
          className={`inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full ${conditionColor[listing.condition]}`}
        >
          {conditionLabel[listing.condition]}
        </span>
      </div>
    </Link>
  );
}
