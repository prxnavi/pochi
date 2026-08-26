import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const username =
        (data.user.user_metadata?.username as string | undefined) ??
        data.user.email?.split("@")[0] ??
        "collector";

      // create the profile row on first sign-in; ignoreDuplicates skips the
      // no-op case where it already exists, but a real failure here left
      // users signed in with no public.users row and every later listing
      // or trade insert failing on the FK with a confusing error, so it's
      // surfaced (not silently discarded) instead.
      const { error: profileError } = await supabase
        .from("users")
        .upsert(
          { id: data.user.id, email: data.user.email!, username },
          { onConflict: "id", ignoreDuplicates: true }
        );

      if (profileError) {
        console.error("failed to create profile row on sign-in:", profileError);
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
