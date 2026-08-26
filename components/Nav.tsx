"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b-2 border-ink/10 bg-cream/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-extrabold text-2xl text-ink tracking-tight">
          pochi<span className="text-box-pink-deep">.</span>
        </Link>
        <nav className="flex items-center gap-5 font-body text-sm font-semibold">
          <Link href="/" className="hover:text-box-pink-deep transition-colors">
            browse
          </Link>
          {email ? (
            <>
              <Link href="/listings/new" className="hover:text-box-pink-deep transition-colors">
                list a figure
              </Link>
              <Link href="/trades" className="hover:text-box-pink-deep transition-colors">
                my trades
              </Link>
              <button
                onClick={signOut}
                className="text-ink-soft hover:text-ink transition-colors"
              >
                sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-ink text-cream px-4 py-1.5 rounded-full hover:bg-box-pink-deep transition-colors"
            >
              sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
