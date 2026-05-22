"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function authWithEmail(_prevState: unknown, formData: FormData) {
  const mode = formData.get("mode") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;
  const supabase = await createClient();

  if (mode === "signup") {
    const displayName = (formData.get("display_name") as string | null)?.trim();
    if (!displayName) return { error: "Display name is required." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: displayName } },
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
  }

  const destination = next?.startsWith("/") ? next : "/dashboard";
  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
