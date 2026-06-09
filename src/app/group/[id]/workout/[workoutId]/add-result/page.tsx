import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminAddResultForm } from "./AdminAddResultForm";

export default async function AdminAddResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; workoutId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id, workoutId } = await params;
  const sp = await searchParams;
  const userId = typeof sp.userId === "string" ? sp.userId : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select("admin_user_id")
    .eq("id", id)
    .single();

  if (!group || group.admin_user_id !== user.id) redirect(`/group/${id}`);
  if (!userId) redirect(`/group/${id}`);

  const [{ data: workout }, { data: member }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, title, description, metric_type, group_id")
      .eq("id", workoutId)
      .single(),
    supabase.from("profiles").select("id, name").eq("id", userId).single(),
  ]);

  if (!workout || workout.group_id !== id) redirect(`/group/${id}`);
  if (!member) redirect(`/group/${id}`);

  // Redirect if submission already exists (admin should use edit instead)
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("workout_id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) redirect(`/group/${id}/submission/${existing.id}/edit`);

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/group/${id}`} className="text-sm text-zinc-500 underline hover:text-zinc-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Add result</h1>
      </div>

      <AdminAddResultForm
        groupId={id}
        workoutId={workoutId}
        userId={userId}
        workout={workout}
        memberName={member.name}
      />
    </main>
  );
}
