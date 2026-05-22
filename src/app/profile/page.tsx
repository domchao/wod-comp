import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  return (
    <main className="mx-auto max-w-lg p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Edit profile</h1>
      </div>
      <ProfileForm currentName={profile.name} />
    </main>
  );
}
