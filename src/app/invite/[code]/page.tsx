import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendPushToGroupMembers } from "@/lib/push";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/?next=/invite/${encodeURIComponent(code)}`);

  const { data: groupId, error } = await supabase.rpc("join_group_by_invite_code", {
    p_invite_code: code.toLowerCase(),
  });

  if (error) {
    if (error.message.includes("Invalid invite code")) redirect("/dashboard?error=invalid_invite");
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  sendPushToGroupMembers(
    groupId,
    {
      title: "New member",
      body: `${profile?.name ?? "Someone"} just joined the group`,
      url: `/group/${groupId}`,
    },
    user.id
  ).catch(console.error);

  redirect(`/group/${groupId}`);
}
