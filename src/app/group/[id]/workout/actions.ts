"use server";

import { createClient } from "@/lib/supabase/server";
import { formatWeekStart, getWeekSetter } from "@/lib/rotation";
import { redirect } from "next/navigation";

export async function createWorkout(_prevState: unknown, formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const metricType = formData.get("metric_type") as string;

  if (!title) return { error: "Title is required" };
  if (!metricType) return { error: "Metric type is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id, group_members(user_id, joined_at)")
    .eq("id", groupId)
    .single();

  if (!group) return { error: "Group not found" };

  const members = (group.group_members as unknown as { user_id: string; joined_at: string }[]).map(
    (m) => ({ id: m.user_id, joined_at: m.joined_at })
  );

  const setterId = getWeekSetter(members);
  const isAdmin = group.admin_user_id === user.id;
  const isMyTurn = setterId === user.id;

  if (!isMyTurn && !isAdmin) {
    return { error: "It's not your turn to set the workout this week" };
  }

  const weekStart = formatWeekStart();

  const { data: existing } = await supabase
    .from("workouts")
    .select("id")
    .eq("group_id", groupId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  if (existing) return { error: "A workout has already been posted for this week" };

  const { error } = await supabase.from("workouts").insert({
    group_id: groupId,
    title,
    description,
    metric_type: metricType,
    week_start_date: weekStart,
  });

  if (error) return { error: error.message };

  redirect(`/group/${groupId}`);
}

export async function updateWorkout(_prevState: unknown, formData: FormData) {
  const workoutId = formData.get("workout_id") as string;
  const groupId = formData.get("group_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const metricType = formData.get("metric_type") as string;

  if (!title) return { error: "Title is required" };
  if (!metricType) return { error: "Metric type is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ title, description, metric_type: metricType })
    .eq("id", workoutId);

  if (error) return { error: error.message };

  redirect(`/group/${groupId}`);
}

export async function deleteWorkout(formData: FormData) {
  const workoutId = formData.get("workout_id") as string;
  const groupId = formData.get("group_id") as string;

  const supabase = await createClient();
  await supabase.from("workouts").delete().eq("id", workoutId);

  redirect(`/group/${groupId}`);
}
