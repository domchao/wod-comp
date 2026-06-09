import { createClient } from "@supabase/supabase-js";
import { formatValue } from "@/lib/submissions";
import type { Metadata } from "next";
import { AutoRedirect } from "@/app/share/_components/AutoRedirect";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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

type SubDest = {
  workout_id: string;
  workouts: { group_id: string; week_start_date: string };
};

export default async function ResultSharePage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const supabase = anonClient();

  const { data } = await supabase
    .from("submissions")
    .select("workout_id, workouts!inner(group_id, week_start_date)")
    .eq("id", submissionId)
    .single();

  const sub = data as unknown as SubDest | null;
  const dest = sub
    ? `/group/${sub.workouts.group_id}?week=${sub.workouts.week_start_date}`
    : "/dashboard";

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
