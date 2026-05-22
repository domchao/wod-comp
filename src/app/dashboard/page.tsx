import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-zinc-400">Dashboard — coming soon</p>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900 underline">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
