import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { AutoRedirect } from "@/app/share/_components/AutoRedirect";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type WorkoutMeta = { title: string; groups: { name: string } | null };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}): Promise<Metadata> {
  const { workoutId } = await params;
  const supabase = anonClient();
  const { data } = await supabase
    .from("workouts")
    .select("title, groups(name)")
    .eq("id", workoutId)
    .single();

  const workout = data as unknown as WorkoutMeta | null;
  const groupName = workout?.groups?.name;
  return {
    title: workout ? `${workout.title} — WOD Comp` : "WOD Comp",
    description: groupName ? `This week's workout in ${groupName}` : "This week's workout",
  };
}

export default async function WorkoutSharePage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const supabase = anonClient();

  const { data } = await supabase
    .from("workouts")
    .select("group_id, week_start_date")
    .eq("id", workoutId)
    .single();

  const dest = data ? `/group/${data.group_id}?week=${data.week_start_date}` : "/dashboard";

  return (
    <>
      <AutoRedirect to={dest} />
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <a href={dest} className="text-zinc-400 text-sm hover:text-zinc-200">
          Open WOD Comp →
        </a>
      </main>
    </>
  );
}
