"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditUsernameForm({
  userId,
  currentUsername,
}: {
  userId: string;
  currentUsername: string;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = username.trim();
    if (!trimmed) {
      setError("username can't be empty.");
      return;
    }
    if (trimmed === currentUsername) {
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from("users")
      .update({ username: trimmed })
      .eq("id", userId);
    setLoading(false);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "that username is already taken — try another."
          : updateError.message
      );
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-bold text-ink mb-1">username</label>
        <input
          type="text"
          required
          maxLength={30}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setSaved(false);
          }}
          className="w-full rounded-xl border-2 border-ink/15 px-4 py-2.5 font-semibold focus:outline-none focus:border-box-pink-deep"
        />
        <p className="mt-1 text-xs font-semibold text-ink-soft">
          this is what other collectors see on your listings and trades.
        </p>
      </div>
      {error && <p className="text-sm font-semibold text-box-pink-deep">{error}</p>}
      {saved && <p className="text-sm font-semibold text-mint">username updated.</p>}
      <button
        type="submit"
        disabled={loading || username.trim() === currentUsername}
        className="self-start bg-ink text-cream font-bold rounded-full px-5 py-2 text-sm hover:bg-box-pink-deep transition-colors disabled:opacity-40"
      >
        {loading ? "saving..." : "save"}
      </button>
    </form>
  );
}
