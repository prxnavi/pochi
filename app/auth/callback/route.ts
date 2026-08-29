import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const base =
        slugify(
          (data.user.user_metadata?.full_name as string | undefined) ??
            (data.user.user_metadata?.name as string | undefined) ??
            data.user.email?.split("@")[0] ??
            ""
        ) || "collector";

      // create the profile row on first sign-in; ignoreDuplicates skips the
      // no-op case where it already exists. username has its own unique
      // constraint though, so a first-time collision with someone else's
      // name (both signed in as e.g. "Sam") retries with a random suffix
      // instead of failing the whole sign-in.
      let username = base;
      let profileError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: upsertError } = await supabase
          .from("users")
          .upsert(
            { id: data.user.id, email: data.user.email!, username },
            { onConflict: "id", ignoreDuplicates: true }
          );

        profileError = upsertError;
        if (!upsertError || upsertError.code !== "23505") break;
        username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      if (profileError) {
        console.error("failed to create profile row on sign-in:", profileError);
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
