"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id")
    .eq("id", groupId)
    .single();

  if (!group) return { user: null, error: "Group not found" };
  if (group.admin_user_id !== user.id)
    return { user: null, error: "Only the group admin can change the setter" };

  return { user, error: null };
}

export async function updateSetterOverride(groupId: string, weekStart: string, userId: string) {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase, groupId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("setter_overrides")
    .upsert({ group_id: groupId, week_start_date: weekStart, user_id: userId });

  if (error) return { error: error.message };

  revalidatePath(`/group/${groupId}`);
  return { success: true } as const;
}

export async function clearSetterOverride(groupId: string, weekStart: string) {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase, groupId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("setter_overrides")
    .delete()
    .eq("group_id", groupId)
    .eq("week_start_date", weekStart);

  if (error) return { error: error.message };

  revalidatePath(`/group/${groupId}`);
  return { success: true } as const;
}
