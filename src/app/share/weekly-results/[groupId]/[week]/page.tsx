import { createClient } from "@supabase/supabase-js";
import { sortSubmissions, formatValue } from "@/lib/submissions";
import Link from "next/link";
import type { Metadata } from "next";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function formatWeekLabel(weekStr: string): string {
  const [y, m, d] = weekStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string; week: string }>;
}): Promise<Metadata> {
  const { groupId, week } = await params;
  const supabase = adminClient();
  const { data: group } = await supabase.from("groups").select("name").eq("id", groupId).single();

  const weekLabel = formatWeekLabel(week);
  return {
    title: group?.name
      ? `${group.name} — Week of ${weekLabel} — WOD Comp`
      : `Weekly Results — WOD Comp`,
    description: `WOD Comp results for the week of ${weekLabel}`,
  };
}

export default async function WeeklyResultsSharePage({
  params,
}: {
  params: Promise<{ groupId: string; week: string }>;
}) {
  const { groupId, week } = await params;
  const supabase = adminClient();

  const [{ data: group }, { data: workout }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", groupId).single(),
    supabase
      .from("workouts")
      .select("id, title, metric_type")
      .eq("group_id", groupId)
      .eq("week_start_date", week)
      .maybeSingle(),
  ]);

  if (!workout) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <p>No workout found for this week.</p>
      </main>
    );
  }

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("user_id, value, rx, profiles!submissions_user_id_fkey(name)")
    .eq("workout_id", workout.id);

  type SubRow = {
    user_id: string;
    value: number;
    rx: boolean;
    profiles: { name: string };
  };
  const subs = (subsRaw ?? []) as unknown as SubRow[];
  const sorted = sortSubmissions(subs, workout.metric_type);
  const winner = sorted[0];
  const weekLabel = formatWeekLabel(week);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/share/weekly-results/${groupId}/${week}/opengraph-image`}
          alt={`Weekly results — ${group?.name ?? "WOD Comp"}`}
          width={1200}
          height={630}
          className="w-full rounded-xl shadow-2xl"
        />
        <div className="text-center space-y-2">
          <p className="text-zinc-400 text-sm">
            {group?.name ? `${group.name} · ` : ""}Week of {weekLabel}
            {winner
              ? ` · Won by ${winner.profiles.name} (${formatValue(winner.value, workout.metric_type)}${winner.rx ? " Rx" : ""})`
              : ""}
          </p>
          <Link
            href={`/group/${groupId}?week=${week}`}
            className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Open in WOD Comp →
          </Link>
        </div>
      </div>
    </main>
  );
}
