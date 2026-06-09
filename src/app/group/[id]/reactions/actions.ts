"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendPushToUsers } from "@/lib/push";

export async function toggleReaction(
  groupId: string,
  submissionId: string,
  emoji: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: existing } = await supabase
    .from("reactions")
    .select("user_id")
    .eq("submission_id", submissionId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("reactions")
      .delete()
      .eq("submission_id", submissionId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    await supabase
      .from("reactions")
      .insert({ submission_id: submissionId, user_id: user.id, emoji });

    const [{ data: submission }, { data: profile }] = await Promise.all([
      supabase.from("submissions").select("user_id").eq("id", submissionId).single(),
      supabase.from("profiles").select("name").eq("id", user.id).single(),
    ]);

    if (submission?.user_id && submission.user_id !== user.id) {
      sendPushToUsers([submission.user_id], {
        title: "New reaction",
        body: `${profile?.name ?? "Someone"} reacted ${emoji} to your result`,
        url: `/group/${groupId}`,
      }).catch(console.error);
    }
  }

  revalidatePath(`/group/${groupId}`);
}
