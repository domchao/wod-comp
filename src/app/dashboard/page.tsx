import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NoGroups } from "./_components/NoGroups";
import { GroupsDashboard } from "./_components/GroupsDashboard";

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

  const groups = memberships
    .map((m) => m.groups as unknown as { id: string; name: string } | null)
    .filter((g): g is { id: string; name: string } => g !== null);

  return <GroupsDashboard groups={groups} />;
}
