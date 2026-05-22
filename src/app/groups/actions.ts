"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  redirect(`/group/${groupId}`);
}
