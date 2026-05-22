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
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
  }

  const destination = next?.startsWith("/") ? next : "/dashboard";
  redirect(destination);
}

export async function signInWithGoogle(formData: FormData) {
  const next = formData.get("next") as string | null;
  const supabase = await createClient();
  const callbackUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`);
  if (next?.startsWith("/")) callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
