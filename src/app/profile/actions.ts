"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
