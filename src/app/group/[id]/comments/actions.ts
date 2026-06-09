"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendPushToGroupMembers } from "@/lib/push";

type CommentState = { error: string } | { success: true } | null;

export async function addComment(
  _prevState: CommentState,
  formData: FormData
): Promise<CommentState> {
  const workoutId = formData.get("workout_id") as string;
  const groupId = formData.get("group_id") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!body) return { error: "Comment cannot be empty" };
  if (body.length > 500) return { error: "Comment must be 500 characters or fewer" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("comments")
    .insert({ workout_id: workoutId, user_id: user.id, body });

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  sendPushToGroupMembers(
    groupId,
    {
      title: "New comment",
      body: `${profile?.name ?? "Someone"} commented on this week's workout`,
      url: `/group/${groupId}`,
    },
    user.id
  ).catch(console.error);

  revalidatePath(`/group/${groupId}`);
  return { success: true };
}

export async function deleteComment(formData: FormData) {
  const commentId = formData.get("comment_id") as string;
  const groupId = formData.get("group_id") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);

  revalidatePath(`/group/${groupId}`);
  redirect(`/group/${groupId}`);
}
