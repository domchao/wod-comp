import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HeaderMenu } from "./_components/HeaderMenu";
import { GroupNameEditor } from "./_components/GroupNameEditor";
import { deleteWorkout } from "./workout/actions";
import { formatWeekStart, getWeekSetter } from "@/lib/rotation";
import { sortSubmissions, formatValue } from "@/lib/submissions";
import { CommentThread } from "./_components/CommentThread";
import { ReactionBar } from "./_components/ReactionBar";
import { WeekNav } from "./_components/WeekNav";
import Link from "next/link";
import { InviteSection } from "./_components/InviteSection";

const METRIC_LABELS: Record<string, string> = {
  time: "For time",
  reps: "Max reps",
  weight: "Max weight",
  rounds: "AMRAP",
};

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const todayWeekStr = formatWeekStart();
  const rawWeek = (await searchParams).week;
  const requestedWeek = typeof rawWeek === "string" ? rawWeek : todayWeekStr;
  // Clamp to current week — don't allow viewing future weeks
  const effectiveWeek = requestedWeek > todayWeekStr ? todayWeekStr : requestedWeek;
  const isCurrentWeek = effectiveWeek === todayWeekStr;

  const [{ data: group }, { data: currentWorkout }, { data: allWorkoutWeeks }] = await Promise.all([
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
      .select("id, title, description, metric_type, photo_url")
      .eq("group_id", id)
      .eq("week_start_date", effectiveWeek)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("week_start_date")
      .eq("group_id", id)
      .order("week_start_date", { ascending: true }),
  ]);

  if (!group) redirect("/dashboard");

  const sortedWeeks = (allWorkoutWeeks ?? []).map((w) => w.week_start_date).sort();
  const prevWeek = sortedWeeks.filter((w) => w < effectiveWeek).at(-1) ?? null;
  const nextWeek = sortedWeeks.filter((w) => w > effectiveWeek && w <= todayWeekStr)[0] ?? null;

  const [{ data: submissions }, { data: comments }, { data: reactionRows }] = currentWorkout
    ? await Promise.all([
        supabase
          .from("submissions")
          .select("id, user_id, value, notes, rx, profiles!submissions_user_id_fkey(name)")
          .eq("workout_id", currentWorkout.id),
        supabase
          .from("comments")
          .select("id, user_id, body, created_at, profiles!comments_user_id_fkey(name)")
          .eq("workout_id", currentWorkout.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("reactions")
          .select("submission_id, user_id, emoji, submissions!inner(workout_id)")
          .eq("submissions.workout_id", currentWorkout.id),
      ])
    : ([{ data: null }, { data: null }, { data: null }] as const);

  const members = (
    group.group_members as unknown as {
      joined_at: string;
      profiles: { id: string; name: string };
    }[]
  ).sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  const [effY, effM, effD] = effectiveWeek.split("-").map(Number);
  const setterId = getWeekSetter(
    members.map((m) => ({ id: m.profiles.id, joined_at: m.joined_at })),
    new Date(effY, effM - 1, effD)
  );
  const setter = members.find((m) => m.profiles.id === setterId);
  const isAdmin = group.admin_user_id === user.id;
  const isMyTurn = setterId === user.id;
  const canPost = (isMyTurn || isAdmin) && !currentWorkout;

  type SubmissionRow = {
    id: string;
    user_id: string;
    value: number;
    notes: string | null;
    rx: boolean;
    profiles: { name: string };
  };
  type Submission = SubmissionRow & { reactions: { user_id: string; emoji: string }[] };
  type Comment = {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
    profiles: { name: string };
  };

  type ReactionRow = { submission_id: string; user_id: string; emoji: string };
  const reactionMap = ((reactionRows ?? []) as unknown as ReactionRow[]).reduce<
    Record<string, { user_id: string; emoji: string }[]>
  >((acc, r) => {
    (acc[r.submission_id] ??= []).push({ user_id: r.user_id, emoji: r.emoji });
    return acc;
  }, {});

  const rankedSubmissions = sortSubmissions(
    ((submissions ?? []) as unknown as SubmissionRow[]).map(
      (s): Submission => ({ ...s, reactions: reactionMap[s.id] ?? [] })
    ),
    currentWorkout?.metric_type ?? ""
  );
  const mySubmission = rankedSubmissions.find((s) => s.user_id === user.id);
  const typedComments = (comments ?? []) as unknown as Comment[];

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-8">
      <div className="flex items-center justify-between">
        <GroupNameEditor groupId={id} name={group.name} isAdmin={isAdmin} />
        <HeaderMenu groupId={id} isAdmin={isAdmin} />
      </div>

      <div className="space-y-3">
        <WeekNav
          groupId={id}
          weekStr={effectiveWeek}
          prevWeek={prevWeek}
          nextWeek={nextWeek}
          isCurrentWeek={isCurrentWeek}
        />
        {isCurrentWeek && (
          <p className="text-sm text-zinc-500">
            {isMyTurn
              ? "Your turn to set the workout"
              : `${setter?.profiles.name}'s turn to set the workout`}
          </p>
        )}
        {currentWorkout ? (
          <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
            <p className="font-medium">{currentWorkout.title}</p>
            {currentWorkout.photo_url && (
              <img
                src={currentWorkout.photo_url}
                alt="Workout"
                className="rounded-md w-full object-contain max-h-64 bg-zinc-50"
              />
            )}
            {currentWorkout.description && (
              <p className="text-sm text-zinc-500">{currentWorkout.description}</p>
            )}
            <p className="text-xs text-zinc-400">{METRIC_LABELS[currentWorkout.metric_type]}</p>
            {isCurrentWeek && (
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
            )}
          </div>
        ) : isCurrentWeek ? (
          canPost ? (
            <Link
              href={`/group/${id}/workout/new`}
              className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Post this week&apos;s workout →
            </Link>
          ) : (
            <p className="text-sm text-zinc-400">Waiting for workout to be posted...</p>
          )
        ) : (
          <p className="text-sm text-zinc-400">No workout was posted this week.</p>
        )}
      </div>

      {currentWorkout && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Leaderboard
          </h2>
          {rankedSubmissions.length === 0 ? (
            <p className="text-sm text-zinc-400">No results yet — be the first to log yours.</p>
          ) : (
            <ol className="space-y-4">
              {rankedSubmissions.map((submission, i) => (
                <li key={submission.user_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
                      <span className={submission.user_id === user.id ? "font-medium" : ""}>
                        {submission.profiles.name}
                        {submission.user_id === user.id && (
                          <span className="text-xs text-zinc-400 ml-1">(you)</span>
                        )}
                      </span>
                      {submission.rx && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 border border-green-200 dark:border-green-800 rounded px-1 py-0.5">
                          Rx
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sm">
                      {formatValue(submission.value, currentWorkout.metric_type)}
                    </span>
                  </div>
                  {submission.notes && (
                    <p className="pl-6 text-xs text-zinc-500 italic">{submission.notes}</p>
                  )}
                  <div className="pl-6">
                    <ReactionBar
                      submissionId={submission.id}
                      groupId={id}
                      currentUserId={user.id}
                      reactions={submission.reactions}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {currentWorkout && (
        <CommentThread
          workoutId={currentWorkout.id}
          groupId={id}
          currentUserId={user.id}
          comments={typedComments}
        />
      )}

      <InviteSection
        inviteCode={group.invite_code}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      />

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
                {member.profiles.id === setterId &&
                  (isCurrentWeek ? "setting this week" : "set this week")}
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
