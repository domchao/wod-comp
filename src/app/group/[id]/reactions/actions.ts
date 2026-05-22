"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  }

  revalidatePath(`/group/${groupId}`);
}
