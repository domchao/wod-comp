"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendPushToGroupMembers } from "@/lib/push";
import { randomUUID } from "crypto";

export async function createGroup(_prevState: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Group name is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Generate ID upfront so we can insert member without needing to SELECT after
  // INSERT (which would fail RLS — user isn't a member yet at that point).
  const groupId = randomUUID();

  const { error: groupError } = await supabase
    .from("groups")
    .insert({ id: groupId, name, admin_user_id: user.id });

  if (groupError) return { error: groupError.message };

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ user_id: user.id, group_id: groupId });

  if (memberError) return { error: memberError.message };

  redirect(`/group/${groupId}`);
}

export async function renameGroup(_prevState: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const groupId = formData.get("group_id") as string;

  if (!name) return { error: "Group name is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id")
    .eq("id", groupId)
    .single();

  if (!group) return { error: "Group not found" };
  if (group.admin_user_id !== user.id)
    return { error: "Only the group admin can rename the group" };

  const { error } = await supabase.from("groups").update({ name }).eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/group/${groupId}`);
  revalidatePath("/dashboard");
  return { success: true } as const;
}

export async function deleteGroup(_prevState: unknown, formData: FormData) {
  const groupId = formData.get("group_id") as string;
  if (!groupId) return { error: "Group ID is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id")
    .eq("id", groupId)
    .single();

  if (!group) return { error: "Group not found" };
  if (group.admin_user_id !== user.id)
    return { error: "Only the group admin can delete the group" };

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function joinGroup(_prevState: unknown, formData: FormData) {
  const inviteCode = (formData.get("invite_code") as string)?.trim().toLowerCase();
  if (!inviteCode) return { error: "Invite code is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: groupId, error } = await supabase.rpc("join_group_by_invite_code", {
    p_invite_code: inviteCode,
  });

  if (error) {
    if (error.message.includes("Invalid invite code")) return { error: "Invalid invite code" };
    return { error: error.message };
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
