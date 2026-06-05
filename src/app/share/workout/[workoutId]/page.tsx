import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";

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

  type WorkoutFull = {
    title: string;
    description: string | null;
    metric_type: string;
    week_start_date: string;
    group_id: string;
    groups: { name: string } | null;
  };

  const { data } = await supabase
    .from("workouts")
    .select("title, description, metric_type, week_start_date, group_id, groups(name)")
    .eq("id", workoutId)
    .single();
  const workout = data as unknown as WorkoutFull | null;

  if (!workout) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <p>Workout not found.</p>
      </main>
    );
  }

  const groupName = workout.groups?.name;

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/share/workout/${workoutId}/opengraph-image`}
          alt={workout.title}
          width={1200}
          height={630}
          className="w-full rounded-xl shadow-2xl"
        />
        <div className="text-center space-y-2">
          <p className="text-zinc-400 text-sm">{groupName ? `${groupName} · ` : ""}WOD Comp</p>
          <Link
            href={`/group/${workout.group_id}`}
            className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Open in WOD Comp →
          </Link>
        </div>
      </div>
    </main>
  );
}
