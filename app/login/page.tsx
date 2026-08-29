"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());

  async function handleSignIn() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // on success the browser is redirected to Google automatically; we only
    // reach here ourselves if something was wrong before that could happen
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">sign in</h1>
      <p className="text-ink-soft font-semibold mb-8">
        one click, no password, no email to check.
      </p>
      {error && <p className="text-sm font-semibold text-box-pink-deep mb-4">{error}</p>}
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="inline-flex items-center gap-2.5 bg-ink text-cream font-bold rounded-full px-6 py-2.5 hover:bg-box-pink-deep transition-colors disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#fff"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
          />
          <path
            fill="#fff"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.94v2.33A9 9 0 0 0 9 18Z"
          />
          <path
            fill="#fff"
            d="M3.95 10.71A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.71V4.96H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.04l3.01-2.33Z"
          />
          <path
            fill="#fff"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.96l3.01 2.33C4.66 5.16 6.65 3.58 9 3.58Z"
          />
        </svg>
        {loading ? "redirecting..." : "continue with Google"}
      </button>
    </div>
  );
}
