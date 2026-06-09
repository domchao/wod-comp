"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendPushToGroupMembers } from "@/lib/push";
import { encodeRoundsReps } from "@/lib/submissions";

export async function submitResult(_prevState: unknown, formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const workoutId = formData.get("workout_id") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const rx = formData.get("rx") === "true";

  const rawMinutes = formData.get("minutes") as string | null;
  const rawSeconds = formData.get("seconds") as string | null;
  const rawRoundsCount = formData.get("rounds_count") as string | null;
  const rawRepsCount = formData.get("reps_count") as string | null;
  const rawValue = formData.get("value") as string | null;

  let value: number;
  if (rawMinutes !== null && rawSeconds !== null) {
    const mins = parseInt(rawMinutes, 10);
    const secs = parseInt(rawSeconds, 10);
    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0 || secs > 59) {
      return { error: "Please enter a valid time" };
    }
    value = mins * 60 + secs;
  } else if (rawRoundsCount !== null && rawRepsCount !== null) {
    const rounds = parseInt(rawRoundsCount, 10);
    const reps = parseInt(rawRepsCount, 10);
    if (isNaN(rounds) || isNaN(reps) || rounds < 0 || reps < 0) {
      return { error: "Please enter a valid result" };
    }
    value = encodeRoundsReps(rounds, reps);
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
      { workout_id: workoutId, user_id: user.id, value, notes, rx },
      { onConflict: "workout_id,user_id" }
    );

  if (error) return { error: error.message };

  const [{ data: profile }, { data: workout }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase.from("workouts").select("group_id").eq("id", workoutId).single(),
  ]);

  if (workout?.group_id) {
    sendPushToGroupMembers(
      workout.group_id,
      {
        title: "New result logged",
        body: `${profile?.name ?? "Someone"} just logged their result`,
        url: `/group/${workout.group_id}`,
      },
      user.id
    ).catch(console.error);
  }

  redirect(`/group/${groupId}`);
}
