import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { NoGroups } from "./_components/NoGroups";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return <NoGroups />;
  }

  // Single group — go straight there
  if (memberships.length === 1) {
    redirect(`/group/${memberships[0].group_id}`);
  }

  // Multiple groups — show a list
  return (
    <main className="mx-auto max-w-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your groups</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-900">
            Sign out
          </button>
        </form>
      </div>
      <ul className="space-y-2">
        {memberships.map((m) => {
          const group = m.groups as unknown as { id: string; name: string } | null;
          if (!group) return null;
          return (
            <li key={group.id}>
              <a
                href={`/group/${group.id}`}
                className="block rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium hover:bg-zinc-50"
              >
                {group.name}
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
