import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotificationSettings } from "./NotificationSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Notifications
        </h2>
        <NotificationSettings />
      </section>
    </main>
  );
}
