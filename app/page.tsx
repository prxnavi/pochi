import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import Link from "next/link";
import type { Listing } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Brand names collectors search under interchangeably — same toy line,
// different regional name (Sylvanian Families outside the US, Calico
// Critters in the US). Add more pairs here as other aliases come up.
const SYNONYM_PAIRS: [string, string][] = [["sylvanian", "calico"]];

function synonymFor(term: string): string | null {
  const lower = term.toLowerCase();
  for (const [a, b] of SYNONYM_PAIRS) {
    if (lower.includes(a)) return b;
    if (lower.includes(b)) return a;
  }
  return null;
}

async function searchListings(supabase: SupabaseServerClient, term: string) {
  const { data } = await supabase
    .from("listings")
    .select("*, users(username)")
    .eq("status", "available")
    .ilike("figure_name", `%${term}%`)
    .order("created_at", { ascending: false });
  return (data ?? []) as Listing[];
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // an empty term's "%%" ilike matches every row, so this doubles as the
  // no-search-query case too
  let listings = await searchListings(supabase, q ?? "");

  // searching one brand name also pulls in listings under its alias, so
  // "sylvanian" surfaces "Calico Critters ..." figures and vice versa
  if (q) {
    const synonym = synonymFor(q);
    if (synonym) {
      const extra = await searchListings(supabase, synonym);
      const seen = new Set(listings.map((l) => l.id));
      listings = [...listings, ...extra.filter((l) => !seen.has(l.id))].sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1
      );
    }
  }

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

      <form action="/" method="GET" className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="search by figure name..."
          className="w-full min-w-0 rounded-xl border-2 border-ink/15 px-4 py-2.5 font-semibold focus:outline-none focus:border-box-pink-deep"
        />
        {q && (
          <Link
            href="/"
            className="shrink-0 flex items-center px-4 rounded-xl border-2 border-ink/15 font-bold text-sm hover:border-box-pink-deep transition-colors"
          >
            clear
          </Link>
        )}
      </form>

      {!user && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-box-pink-deep/40 bg-box-pink/10 p-4 text-sm font-semibold text-ink">
          sign in to list your own figures and propose trades.
        </div>
      )}

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : q ? (
        <div className="text-center py-20">
          <p className="font-display text-2xl text-ink/40 mb-2">no matches for &ldquo;{q}&rdquo;</p>
          <p className="text-ink-soft font-semibold">try a different name, or browse everything.</p>
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
