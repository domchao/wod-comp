"use server";

import { createClient } from "@/lib/supabase/server";
import { formatWeekStart, getWeekSetter } from "@/lib/rotation";
import { redirect } from "next/navigation";
import { sendPushToGroupMembers } from "@/lib/push";

async function uploadWorkoutPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${groupId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("workout-photos").upload(path, file, {
    contentType: file.type,
  });
  if (error) return { error: `Photo upload failed: ${error.message}` };
  const {
    data: { publicUrl },
  } = supabase.storage.from("workout-photos").getPublicUrl(path);
  return { url: publicUrl };
}

function storagePathFromUrl(url: string): string | null {
  // Public URL format: .../storage/v1/object/public/workout-photos/{path}
  const match = url.match(/\/storage\/v1\/object\/public\/workout-photos\/(.+)/);
  return match ? match[1] : null;
}

export async function createWorkout(_prevState: unknown, formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const metricType = formData.get("metric_type") as string;
  const photoFile = formData.get("photo") as File | null;

  if (!title) return { error: "Title is required" };
  if (!metricType) return { error: "Metric type is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id, timezone, group_members(user_id, rotation_order)")
    .eq("id", groupId)
    .single();

  if (!group) return { error: "Group not found" };

  const weekStart = formatWeekStart(new Date(), group.timezone ?? "UTC");

  const [{ data: overrideRow }, { data: existing }] = await Promise.all([
    supabase
      .from("setter_overrides")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("week_start_date", weekStart)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("id")
      .eq("group_id", groupId)
      .eq("week_start_date", weekStart)
      .maybeSingle(),
  ]);

  const sortedMembers = (
    group.group_members as unknown as { user_id: string; rotation_order: number }[]
  )
    .slice()
    .sort((a, b) => a.rotation_order - b.rotation_order)
    .map((m) => ({ id: m.user_id, rotation_order: m.rotation_order }));

  const naturalSetterId = getWeekSetter(sortedMembers, new Date(), group.timezone ?? "UTC");
  const setterId = overrideRow?.user_id ?? naturalSetterId;
  const isAdmin = group.admin_user_id === user.id;
  const isMyTurn = setterId === user.id;

  if (!isMyTurn && !isAdmin) {
    return { error: "It's not your turn to set the workout this week" };
  }

  if (existing) return { error: "A workout has already been posted for this week" };

  let photoUrl: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const result = await uploadWorkoutPhoto(supabase, groupId, photoFile);
    if ("error" in result) return result;
    photoUrl = result.url;
  }

  const { error } = await supabase.from("workouts").insert({
    group_id: groupId,
    title,
    description,
    metric_type: metricType,
    week_start_date: weekStart,
    photo_url: photoUrl,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  sendPushToGroupMembers(
    groupId,
    {
      title: "New workout posted",
      body: `${profile?.name ?? "Someone"} just set this week's workout: ${title}`,
      url: `/group/${groupId}`,
    },
    user.id
  ).catch(console.error);

  redirect(`/group/${groupId}`);
}

export async function updateWorkout(_prevState: unknown, formData: FormData) {
  const workoutId = formData.get("workout_id") as string;
  const groupId = formData.get("group_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const metricType = formData.get("metric_type") as string;
  const photoFile = formData.get("photo") as File | null;
  const existingPhotoUrl = (formData.get("existing_photo_url") as string) || null;

  if (!title) return { error: "Title is required" };
  if (!metricType) return { error: "Metric type is required" };

  const supabase = await createClient();

  let photoUrl: string | null = existingPhotoUrl;
  if (photoFile && photoFile.size > 0) {
    const result = await uploadWorkoutPhoto(supabase, groupId, photoFile);
    if ("error" in result) return result;
    photoUrl = result.url;

    // Delete the old photo from storage if it was replaced
    if (existingPhotoUrl) {
      const oldPath = storagePathFromUrl(existingPhotoUrl);
      if (oldPath) {
        await supabase.storage.from("workout-photos").remove([oldPath]);
      }
    }
  }

  const { error } = await supabase
    .from("workouts")
    .update({ title, description, metric_type: metricType, photo_url: photoUrl })
    .eq("id", workoutId);

  if (error) return { error: error.message };

  redirect(`/group/${groupId}`);
}

export async function deleteWorkout(formData: FormData) {
  const workoutId = formData.get("workout_id") as string;
  const groupId = formData.get("group_id") as string;

  const supabase = await createClient();

  // Clean up photo from storage if present
  const { data: workout } = await supabase
    .from("workouts")
    .select("photo_url")
    .eq("id", workoutId)
    .single();

  if (workout?.photo_url) {
    const path = storagePathFromUrl(workout.photo_url);
    if (path) {
      await supabase.storage.from("workout-photos").remove([path]);
    }
  }

  await supabase.from("workouts").delete().eq("id", workoutId);

  redirect(`/group/${groupId}`);
}
