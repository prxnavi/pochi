"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Condition } from "@/types/database";

export default function NewListingPage() {
  const [figureName, setFigureName] = useState("");
  const [series, setSeries] = useState("");
  const [condition, setCondition] = useState<Condition>("mint");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("sign in first.");
      setLoading(false);
      return;
    }

    let photo_url: string | null = null;

    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(path, file);

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrl } = supabase.storage.from("listing-photos").getPublicUrl(path);
      photo_url = publicUrl.publicUrl;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("listings")
      .insert({
        user_id: user.id,
        figure_name: figureName.trim(),
        series: series.trim() || null,
        condition,
        photo_url,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/listings/${inserted.id}`);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">list a figure</h1>
      <p className="text-ink-soft font-semibold mb-8">
        add what you&apos;ve got so other collectors can propose a trade.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-ink mb-1">photo</label>
          <label className="block aspect-square w-32 rounded-2xl border-2 border-dashed border-ink/20 bg-white overflow-hidden cursor-pointer flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-ink-soft text-xs font-bold text-center px-2">
                add photo
              </span>
            )}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold text-ink mb-1">figure name</label>
          <input
            type="text"
            required
            value={figureName}
            onChange={(e) => setFigureName(e.target.value)}
            placeholder="Sonny Angel Sleepy Series - Panda"
            className="w-full rounded-xl border-2 border-ink/15 px-4 py-2.5 font-semibold focus:outline-none focus:border-box-pink-deep"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-ink mb-1">series (optional)</label>
          <input
            type="text"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            placeholder="Sleepy Series"
            className="w-full rounded-xl border-2 border-ink/15 px-4 py-2.5 font-semibold focus:outline-none focus:border-box-pink-deep"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-ink mb-1">condition</label>
          <div className="flex gap-2">
            {(["mint", "opened", "loose"] as Condition[]).map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCondition(c)}
                className={`flex-1 rounded-xl border-2 py-2 text-sm font-bold capitalize transition-colors ${
                  condition === c
                    ? "border-box-pink-deep bg-box-pink/30"
                    : "border-ink/15 bg-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-box-pink-deep">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-ink text-cream font-bold rounded-full py-2.5 hover:bg-box-pink-deep transition-colors disabled:opacity-50"
        >
          {loading ? "listing..." : "add to the shelf"}
        </button>
      </form>
    </div>
  );
}
