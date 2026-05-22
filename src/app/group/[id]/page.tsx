import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { deleteWorkout } from "./workout/actions";
import { formatWeekStart, getWeekSetter } from "@/lib/rotation";
import { sortSubmissions } from "@/lib/submissions";
import Link from "next/link";

const METRIC_LABELS: Record<string, string> = {
  time: "For time",
  reps: "Max reps",
  weight: "Max weight",
  rounds: "AMRAP",
};

function formatValue(value: number, metricType: string): string {
  if (metricType === "time") {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
  if (metricType === "weight") return `${value} kg`;
  if (metricType === "reps") return `${value} reps`;
  if (metricType === "rounds") return `${value} rounds`;
  return String(value);
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: group }, { data: currentWorkout }] = await Promise.all([
    supabase
      .from("groups")
      .select(
        `id, name, invite_code, admin_user_id,
         group_members(joined_at, profiles(id, name))`
      )
      .eq("id", id)
      .single(),
    supabase
      .from("workouts")
      .select("id, title, description, metric_type")
      .eq("group_id", id)
      .eq("week_start_date", formatWeekStart())
      .maybeSingle(),
  ]);

  const { data: submissions } = currentWorkout
    ? await supabase
        .from("submissions")
        .select("user_id, value, notes, profiles(name)")
        .eq("workout_id", currentWorkout.id)
    : { data: null };

  if (!group) redirect("/dashboard");

  const members = (
    group.group_members as unknown as {
      joined_at: string;
      profiles: { id: string; name: string };
    }[]
  ).sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  const setterId = getWeekSetter(
    members.map((m) => ({ id: m.profiles.id, joined_at: m.joined_at }))
  );
  const setter = members.find((m) => m.profiles.id === setterId);
  const isAdmin = group.admin_user_id === user.id;
  const isMyTurn = setterId === user.id;
  const canPost = (isMyTurn || isAdmin) && !currentWorkout;

  type Submission = {
    user_id: string;
    value: number;
    notes: string | null;
    profiles: { name: string };
  };
  const rankedSubmissions = sortSubmissions(
    (submissions ?? []) as unknown as Submission[],
    currentWorkout?.metric_type ?? ""
  );
  const mySubmission = rankedSubmissions.find((s) => s.user_id === user.id);

  return (
    <main className="mx-auto max-w-lg p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-900">
            Sign out
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">This week</h2>
        <p className="text-sm text-zinc-500">
          {isMyTurn
            ? "Your turn to set the workout"
            : `${setter?.profiles.name}'s turn to set the workout`}
        </p>
        {currentWorkout ? (
          <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
            <p className="font-medium">{currentWorkout.title}</p>
            {currentWorkout.description && (
              <p className="text-sm text-zinc-500">{currentWorkout.description}</p>
            )}
            <p className="text-xs text-zinc-400">{METRIC_LABELS[currentWorkout.metric_type]}</p>
            <div className="flex gap-3 pt-1 flex-wrap">
              <Link
                href={`/group/${id}/submit`}
                className="inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {mySubmission ? "Update your result" : "Log your result →"}
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href={`/group/${id}/workout/${currentWorkout.id}/edit`}
                    className="text-xs text-zinc-500 underline hover:text-zinc-900"
                  >
                    Edit
                  </Link>
                  <form action={deleteWorkout}>
                    <input type="hidden" name="workout_id" value={currentWorkout.id} />
                    <input type="hidden" name="group_id" value={id} />
                    <button
                      type="submit"
                      className="text-xs text-red-500 underline hover:text-red-700"
                    >
                      Delete
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        ) : canPost ? (
          <Link
            href={`/group/${id}/workout/new`}
            className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Post this week&apos;s workout →
          </Link>
        ) : (
          <p className="text-sm text-zinc-400">Waiting for workout to be posted...</p>
        )}
      </div>

      {currentWorkout && rankedSubmissions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Leaderboard
          </h2>
          <ol className="space-y-2">
            {rankedSubmissions.map((submission, i) => (
              <li key={submission.user_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
                  <span className={submission.user_id === user.id ? "font-medium" : ""}>
                    {submission.profiles.name}
                    {submission.user_id === user.id && (
                      <span className="text-xs text-zinc-400 ml-1">(you)</span>
                    )}
                  </span>
                </div>
                <span className="font-mono text-sm">
                  {formatValue(submission.value, currentWorkout.metric_type)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 p-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Invite code</p>
        <p className="font-mono text-lg font-semibold tracking-widest">
          {group.invite_code.toUpperCase()}
        </p>
        <p className="text-xs text-zinc-400">Share this with friends to join</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Members ({members.length})
        </h2>
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.profiles.id} className="flex items-center justify-between text-sm">
              <span className={member.profiles.id === setterId ? "font-medium" : ""}>
                {member.profiles.name}
              </span>
              <span className="text-xs text-zinc-400">
                {member.profiles.id === setterId && "setting this week"}
                {member.profiles.id === group.admin_user_id &&
                  member.profiles.id !== setterId &&
                  "admin"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
