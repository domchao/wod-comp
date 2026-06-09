import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWeekStart, getWeekSetter } from "@/lib/rotation";
import Link from "next/link";

const WEEKS_AHEAD = 12;

export default async function RotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select(`id, name, admin_user_id, timezone, group_members(rotation_order, profiles(id, name))`)
    .eq("id", id)
    .single();

  if (!group) redirect("/dashboard");
  if (group.admin_user_id !== user.id) redirect(`/group/${id}`);

  const members = (
    group.group_members as unknown as {
      rotation_order: number;
      profiles: { id: string; name: string };
    }[]
  ).sort((a, b) => a.rotation_order - b.rotation_order);

  const thisWeekStart = getWeekStart(new Date(), group.timezone);
  const weeks = Array.from({ length: WEEKS_AHEAD }, (_, i) => {
    const d = new Date(thisWeekStart);
    d.setUTCDate(d.getUTCDate() + i * 7);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dy = String(d.getUTCDate()).padStart(2, "0");
    return { date: d, str: `${y}-${mo}-${dy}` };
  });

  const { data: overrides } = await supabase
    .from("setter_overrides")
    .select("week_start_date, user_id")
    .eq("group_id", id)
    .in(
      "week_start_date",
      weeks.map((w) => w.str)
    );

  const overrideMap = Object.fromEntries(
    (overrides ?? []).map((o) => [o.week_start_date, o.user_id])
  );

  const schedule = weeks.map(({ date, str }, i) => {
    const naturalSetterId = getWeekSetter(
      members.map((m) => ({ id: m.profiles.id, rotation_order: m.rotation_order })),
      date,
      group.timezone
    );
    const overrideUserId = overrideMap[str];
    const setterId = overrideUserId ?? naturalSetterId;
    const setter = members.find((m) => m.profiles.id === setterId);
    return {
      str,
      label: new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      setterName: setter?.profiles.name ?? "Unknown",
      isOverridden: !!overrideUserId,
      isCurrentWeek: i === 0,
    };
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-8">
      <div>
        <Link
          href={`/group/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-2 inline-block"
        >
          ← {group.name}
        </Link>
        <h1 className="text-2xl font-bold">Setter Schedule</h1>
      </div>

      <ul className="space-y-2">
        {schedule.map(({ str, label, setterName, isOverridden, isCurrentWeek }) => (
          <li
            key={str}
            className={`flex items-center justify-between text-sm rounded-lg border px-4 py-3 ${
              isCurrentWeek
                ? "border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <span className={isCurrentWeek ? "font-medium" : "text-zinc-600 dark:text-zinc-400"}>
              {label}
              {isCurrentWeek && <span className="ml-2 text-xs text-zinc-400">this week</span>}
            </span>
            <span className="flex items-center gap-2">
              {isOverridden && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
                  override
                </span>
              )}
              <span className={isCurrentWeek ? "font-medium" : ""}>{setterName}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Rotation order
        </h2>
        <ol className="space-y-1">
          {members.map((m, i) => (
            <li
              key={m.profiles.id}
              className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
            >
              <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
              {m.profiles.name}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
