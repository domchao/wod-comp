"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitResult(_prevState: unknown, formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const workoutId = formData.get("workout_id") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

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

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "You are not a member of this group" };

  const { error } = await supabase
    .from("submissions")
    .upsert(
      { workout_id: workoutId, user_id: user.id, value, notes },
      { onConflict: "workout_id,user_id" }
    );

  if (error) return { error: error.message };

  redirect(`/group/${groupId}`);
}
