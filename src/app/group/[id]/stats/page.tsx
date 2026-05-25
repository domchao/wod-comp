import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sortSubmissions } from "@/lib/submissions";
import { PositionChart, type ChartDataPoint } from "./_components/PositionChart";
import Link from "next/link";

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: group }, { data: profile }, { data: workouts }] = await Promise.all([
    supabase.from("groups").select("id, name").eq("id", id).single(),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase
      .from("workouts")
      .select("id, week_start_date, metric_type, title")
      .eq("group_id", id)
      .order("week_start_date", { ascending: true }),
  ]);

  if (!group) redirect("/dashboard");

  const allWorkouts = workouts ?? [];

  const { data: allSubmissions } = allWorkouts.length
    ? await supabase
        .from("submissions")
        .select("id, user_id, value, rx, workout_id")
        .in(
          "workout_id",
          allWorkouts.map((w) => w.id)
        )
    : { data: [] };

  const submissions = allSubmissions ?? [];
  const mySubmissions = submissions.filter((s) => s.user_id === user.id);

  const totalLogged = mySubmissions.length;
  const rxCount = mySubmissions.filter((s) => s.rx).length;
  const rxPercent = totalLogged > 0 ? Math.round((rxCount / totalLogged) * 100) : 0;

  const weeklyResults: ChartDataPoint[] = allWorkouts
    .filter((w) => mySubmissions.some((s) => s.workout_id === w.id))
    .map((w) => {
      const forWorkout = submissions.filter((s) => s.workout_id === w.id);
      const sorted = sortSubmissions(forWorkout, w.metric_type);
      const myRank = sorted.findIndex((s) => s.user_id === user.id) + 1;
      return {
        week: w.week_start_date,
        rank: myRank,
        total: forWorkout.length,
        workoutTitle: w.title,
      };
    });

  const wins = weeklyResults.filter((r) => r.rank === 1).length;
  const podiums = weeklyResults.filter((r) => r.rank <= 3).length;

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-8">
      <div>
        <Link
          href={`/group/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-2 inline-block"
        >
          ← {group.name}
        </Link>
        <h1 className="text-2xl font-bold">My Stats</h1>
        {profile && <p className="text-sm text-zinc-500">{profile.name}</p>}
      </div>

      {totalLogged === 0 ? (
        <p className="text-sm text-zinc-400">No workouts logged yet — get on the board!</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Logged" value={String(totalLogged)} />
            <StatCard label="Rx" value={`${rxPercent}%`} />
            <StatCard label="Wins" value={String(wins)} />
            <StatCard label="Podiums" value={String(podiums)} />
          </div>

          {weeklyResults.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Finishing position
              </h2>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <PositionChart data={weeklyResults} />
                <p className="text-xs text-zinc-400 mt-2 text-center">
                  Position per week · lower is better · gold = win
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-1">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
