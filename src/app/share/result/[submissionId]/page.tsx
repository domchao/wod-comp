import { createClient } from "@supabase/supabase-js";
import { sortSubmissions, formatValue } from "@/lib/submissions";
import Link from "next/link";
import type { Metadata } from "next";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

type SubMeta = {
  value: number;
  rx: boolean;
  profiles: { name: string };
  workouts: { metric_type: string };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}): Promise<Metadata> {
  const { submissionId } = await params;
  const supabase = anonClient();
  const { data } = await supabase
    .from("submissions")
    .select("value, rx, profiles!submissions_user_id_fkey(name), workouts!inner(metric_type)")
    .eq("id", submissionId)
    .single();

  if (!data) return { title: "WOD Comp" };
  const sub = data as unknown as SubMeta;

  const name = sub.profiles.name;
  const score = formatValue(sub.value, sub.workouts.metric_type);
  return {
    title: `${name} — ${score}${sub.rx ? " Rx" : ""} — WOD Comp`,
    description: "Check out this result on WOD Comp",
  };
}

export default async function ResultSharePage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const supabase = anonClient();

  type SubFull = {
    id: string;
    value: number;
    rx: boolean;
    user_id: string;
    workout_id: string;
    profiles: { name: string };
    workouts: {
      title: string;
      metric_type: string;
      week_start_date: string;
      group_id: string;
      groups: { name: string };
    };
  };

  const { data } = await supabase
    .from("submissions")
    .select(
      `id, value, rx, user_id, workout_id,
       profiles!submissions_user_id_fkey(name),
       workouts!inner(title, metric_type, week_start_date, group_id, groups!inner(name))`
    )
    .eq("id", submissionId)
    .single();

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <p>Result not found.</p>
      </main>
    );
  }

  const sub = data as unknown as SubFull;
  const workout = sub.workouts;
  const userName = sub.profiles.name;

  const { data: allSubsRaw } = await supabase
    .from("submissions")
    .select("user_id, value, rx")
    .eq("workout_id", sub.workout_id);

  type SubRow = { user_id: string; value: number; rx: boolean };
  const sorted = sortSubmissions((allSubsRaw ?? []) as SubRow[], workout.metric_type);
  const position = sorted.findIndex((s) => s.user_id === sub.user_id) + 1;

  const score = formatValue(sub.value, workout.metric_type);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/share/result/${submissionId}/opengraph-image`}
          alt={`${userName} — ${score}`}
          width={1200}
          height={630}
          className="w-full rounded-xl shadow-2xl"
        />
        <div className="text-center space-y-2">
          <p className="text-zinc-400 text-sm">
            {ordinal(position)} place · {score}
            {sub.rx ? " Rx" : ""} · {sub.workouts.groups.name}
          </p>
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
