import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminSubmissionEditForm } from "./AdminSubmissionEditForm";

export default async function AdminEditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
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

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, value, notes, rx, user_id, profiles!submissions_user_id_fkey(name), workouts!submissions_workout_id_fkey(title, description, metric_type, group_id)"
    )
    .eq("id", submissionId)
    .single();

  if (!submission) redirect(`/group/${id}`);

  type SubmissionData = {
    id: string;
    value: number;
    notes: string | null;
    rx: boolean;
    user_id: string;
    profiles: { name: string };
    workouts: { title: string; description: string | null; metric_type: string; group_id: string };
  };

  const s = submission as unknown as SubmissionData;

  if (s.workouts.group_id !== id) redirect(`/group/${id}`);

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/group/${id}`} className="text-sm text-zinc-500 underline hover:text-zinc-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Edit result</h1>
      </div>

      <AdminSubmissionEditForm
        groupId={id}
        submissionId={submissionId}
        workout={s.workouts}
        submission={{ value: s.value, notes: s.notes, rx: s.rx }}
        memberName={s.profiles.name}
      />
    </main>
  );
}
