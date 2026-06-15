import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EditWorkoutForm } from "./EditWorkoutForm";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string; workoutId: string }>;
}) {
  const { id, workoutId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: workout }, { data: group }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, title, description, metric_type, photo_url, created_by")
      .eq("id", workoutId)
      .single(),
    supabase.from("groups").select("admin_user_id").eq("id", id).single(),
  ]);

  if (!workout) redirect(`/group/${id}`);

  const isAdmin = group?.admin_user_id === user.id;
  const isCreator = workout.created_by === user.id;
  if (!isAdmin && !isCreator) redirect(`/group/${id}`);

  return (
    <main className="mx-auto max-w-lg p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit workout</h1>
      <EditWorkoutForm groupId={id} workout={workout} />
    </main>
  );
}
