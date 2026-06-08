import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeLeaderboard } from "@/lib/scoring";
import { formatWeekStart } from "@/lib/rotation";
import { Avatar } from "@/app/_components/Avatar";
import Link from "next/link";

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: group }, { data: workouts }] = await Promise.all([
    supabase.from("groups").select("id, name, timezone").eq("id", id).single(),
    supabase.from("workouts").select("id, metric_type, week_start_date").eq("group_id", id),
  ]);

  if (!group) redirect("/dashboard");

  const currentWeek = formatWeekStart(new Date(), group.timezone ?? "UTC");
  const allWorkouts = (workouts ?? []).filter((w) => w.week_start_date < currentWeek);

  type SubmissionRow = {
    user_id: string;
    value: number;
    rx: boolean;
    workout_id: string;
    profiles: { name: string; avatar_url: string | null };
  };

  const { data: submissionRows } = allWorkouts.length
    ? await supabase
        .from("submissions")
        .select(
          "user_id, value, rx, workout_id, profiles!submissions_user_id_fkey(name, avatar_url)"
        )
        .in(
          "workout_id",
          allWorkouts.map((w) => w.id)
        )
    : { data: [] };

  const submissions = (submissionRows ?? []) as unknown as SubmissionRow[];

  const profileMap = new Map<string, { name: string; avatar_url: string | null }>();
  for (const s of submissions) {
    if (!profileMap.has(s.user_id)) profileMap.set(s.user_id, s.profiles);
  }

  const leaderboard = computeLeaderboard(allWorkouts, submissions);

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-8">
      <div>
        <Link
          href={`/group/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-2 inline-block"
        >
          ← {group.name}
        </Link>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-zinc-500 mt-1">All-time standings</p>
          </div>
          {leaderboard.length > 0 && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${group.name} all-time leaderboard 🏆\n${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/share/leaderboard/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-1"
            >
              Share leaderboard
            </a>
          )}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-zinc-400">No results yet — get on the board!</p>
      ) : (
        <ol className="space-y-1">
          {leaderboard.map((entry, i) => {
            const profile = profileMap.get(entry.user_id);
            const isMe = entry.user_id === user.id;
            return (
              <li
                key={entry.user_id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  isMe ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <span className="w-6 text-center text-base">
                  {MEDAL[i] ?? <span className="text-xs text-zinc-400">{i + 1}</span>}
                </span>
                <Avatar src={profile?.avatar_url ?? null} name={profile?.name ?? "?"} size="sm" />
                <span className={`flex-1 ${isMe ? "font-medium" : ""}`}>
                  {profile?.name ?? "Unknown"}
                  {isMe && <span className="text-xs text-zinc-400 ml-1">(you)</span>}
                </span>
                <span className="text-xs text-zinc-400 tabular-nums">
                  {entry.participated}W{" "}
                  {entry.wins > 0 && (
                    <span className="text-yellow-500">
                      {entry.wins} win{entry.wins !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
                <span className="font-bold tabular-nums">{entry.points} pts</span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
