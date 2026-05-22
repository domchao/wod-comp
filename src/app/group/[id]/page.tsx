import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select(
      `
      id,
      name,
      invite_code,
      admin_user_id,
      group_members(
        joined_at,
        profiles(id, name)
      )
    `
    )
    .eq("id", id)
    .single();

  if (!group) redirect("/dashboard");

  const members = group.group_members as unknown as {
    joined_at: string;
    profiles: { id: string; name: string };
  }[];

  return (
    <main className="mx-auto max-w-lg p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-900">
            Sign out
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Invite code</p>
        <p className="font-mono text-lg font-semibold tracking-widest">
          {group.invite_code.toUpperCase()}
        </p>
        <p className="text-xs text-zinc-400">Share this with friends to join</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Members ({members.length})
        </h2>
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.profiles.id} className="flex items-center justify-between text-sm">
              <span>{member.profiles.name}</span>
              {member.profiles.id === group.admin_user_id && (
                <span className="text-xs text-zinc-400">admin</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
