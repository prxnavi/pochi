"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("pick a username so other collectors know who they're trading with.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { username: username.trim() },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <p className="font-display text-2xl font-bold text-ink mb-2">check your inbox</p>
        <p className="text-ink-soft font-semibold">
          we sent a sign-in link to {email}. click it to open your account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">sign in</h1>
      <p className="text-ink-soft font-semibold mb-8">
        no password, we&apos;ll email you a link.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-ink mb-1">username</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="sonnycollector"
            className="w-full rounded-xl border-2 border-ink/15 px-4 py-2.5 font-semibold focus:outline-none focus:border-box-pink-deep"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border-2 border-ink/15 px-4 py-2.5 font-semibold focus:outline-none focus:border-box-pink-deep"
          />
        </div>
        {error && <p className="text-sm font-semibold text-box-pink-deep">{error}</p>}
        <button
          type="submit"
          className="mt-2 bg-ink text-cream font-bold rounded-full py-2.5 hover:bg-box-pink-deep transition-colors"
        >
          send sign-in link
        </button>
      </form>
    </div>
  );
}
