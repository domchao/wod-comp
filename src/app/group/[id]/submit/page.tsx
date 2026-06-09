import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatWeekStart } from "@/lib/rotation";
import Link from "next/link";
import { SubmitForm } from "./SubmitForm";

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: membership }, { data: group }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("groups").select("timezone").eq("id", id).single(),
  ]);

  if (!membership) redirect("/dashboard");

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, title, description, metric_type")
    .eq("group_id", id)
    .eq("week_start_date", formatWeekStart(new Date(), group?.timezone ?? "UTC"))
    .maybeSingle();

  if (!workout) redirect(`/group/${id}`);

  const { data: existing } = await supabase
    .from("submissions")
    .select("value, notes, rx")
    .eq("workout_id", workout.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/group/${id}`} className="text-sm text-zinc-500 underline hover:text-zinc-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Log your result</h1>
      </div>

      <SubmitForm groupId={id} workout={workout} existing={existing} />
    </main>
  );
}
