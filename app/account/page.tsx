import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EditUsernameForm from "@/components/EditUsernameForm";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, username")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">your profile</h1>
      <p className="text-ink-soft font-semibold mb-8">signed in as {user.email}.</p>
      <EditUsernameForm userId={user.id} currentUsername={profile?.username ?? ""} />
    </div>
  );
}
