"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function adminCreateSubmission(_prevState: unknown, formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const workoutId = formData.get("workout_id") as string;
  const userId = formData.get("user_id") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const rx = formData.get("rx") === "true";

  const rawMinutes = formData.get("minutes") as string | null;
  const rawSeconds = formData.get("seconds") as string | null;
  const rawValue = formData.get("value") as string | null;

  let value: number;
  if (rawMinutes !== null && rawSeconds !== null) {
    const mins = parseInt(rawMinutes, 10);
    const secs = parseInt(rawSeconds, 10);
    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0 || secs > 59) {
      return { error: "Please enter a valid time" };
    }
    value = mins * 60 + secs;
  } else {
    value = parseFloat(rawValue ?? "");
    if (isNaN(value) || value < 0) return { error: "Please enter a valid result" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id")
    .eq("id", groupId)
    .single();

  if (!group || group.admin_user_id !== user.id) {
    return { error: "You are not an admin of this group" };
  }

  const { error } = await supabase.from("submissions").insert({
    workout_id: workoutId,
    user_id: userId,
    value,
    notes,
    rx,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "This member already has a result for this workout" };
    return { error: error.message };
  }

  redirect(`/group/${groupId}`);
}
