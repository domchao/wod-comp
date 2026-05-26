"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function storagePathFromUrl(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/profile-pictures\/(.+)/);
  return match ? match[1] : null;
}

export async function updateDisplayName(_prevState: unknown, formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "Display name cannot be empty." };
  if (name.length > 50) return { error: "Display name must be 50 characters or fewer." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true } as const;
}

export async function uploadProfilePicture(_prevState: unknown, formData: FormData) {
  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "No file selected." };
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5 MB." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(path, file, { contentType: file.type });

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-pictures").getPublicUrl(path);

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  if (existing?.avatar_url) {
    const oldPath = storagePathFromUrl(existing.avatar_url);
    if (oldPath) {
      await supabase.storage.from("profile-pictures").remove([oldPath]);
    }
  }

  revalidatePath("/", "layout");
  return { success: true, avatarUrl: publicUrl } as const;
}

export async function deleteProfilePicture() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.avatar_url) return { error: "No profile picture to remove." };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  const oldPath = storagePathFromUrl(profile.avatar_url);
  if (oldPath) {
    await supabase.storage.from("profile-pictures").remove([oldPath]);
  }

  revalidatePath("/", "layout");
  return { success: true } as const;
}
