"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export default function TradeChat({ tradeId, myId }: { tradeId: string; myId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("messages")
      .select("id, trade_id, sender_id, body, created_at")
      .eq("trade_id", tradeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active && data) setMessages(data as Message[]);
      });

    // live delivery for the other side's messages; our own are appended
    // immediately on send (see handleSend) and deduped here by id
    const channel = supabase
      .channel(`messages-${tradeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `trade_id=eq.${tradeId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, tradeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ trade_id: tradeId, sender_id: myId, body: trimmed })
      .select()
      .single();

    setLoading(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
    setBody("");
  }

  return (
    <div className="mt-3 rounded-xl border-2 border-ink/10 bg-cream/60 p-3">
      <div className="max-h-60 overflow-y-auto flex flex-col gap-2 mb-2">
        {messages.length === 0 && (
          <p className="text-xs font-semibold text-ink-soft text-center py-4">
            say hi and sort out the details.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm font-semibold ${
              m.sender_id === myId
                ? "self-end bg-ink text-cream"
                : "self-start bg-white border-2 border-ink/10"
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-xs font-semibold text-box-pink-deep mb-2">{error}</p>}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="message..."
          maxLength={2000}
          className="w-full min-w-0 rounded-full border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-box-pink-deep"
        />
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="shrink-0 bg-ink text-cream font-bold rounded-full px-4 py-1.5 text-sm hover:bg-box-pink-deep transition-colors disabled:opacity-40"
        >
          send
        </button>
      </form>
    </div>
  );
}
