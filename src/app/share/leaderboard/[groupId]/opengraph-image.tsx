import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { computeLeaderboard } from "@/lib/scoring";
import { formatWeekStart } from "@/lib/rotation";

export const dynamic = "force-dynamic";
export const alt = "All-Time Leaderboard — WOD Comp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const MEDALS: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function Fallback({ groupName }: { groupName?: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        fontFamily: "system-ui, sans-serif",
        gap: 0,
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 800, color: "#fafafa", display: "flex" }}>
        WOD Comp
      </div>
      {groupName && (
        <div style={{ fontSize: 24, color: "#71717a", marginTop: 16, display: "flex" }}>
          {groupName}
        </div>
      )}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = anonClient();

  const [{ data: group }, { data: workoutsRaw }] = await Promise.all([
    supabase.from("groups").select("name, timezone").eq("id", groupId).single(),
    supabase.from("workouts").select("id, metric_type, week_start_date").eq("group_id", groupId),
  ]);

  if (!group) {
    return new ImageResponse(<Fallback />, { ...size });
  }

  const currentWeek = formatWeekStart(new Date(), group.timezone ?? "UTC");
  const allWorkouts = (workoutsRaw ?? []).filter((w) => w.week_start_date < currentWeek);

  if (allWorkouts.length === 0) {
    return new ImageResponse(<Fallback groupName={group.name} />, { ...size });
  }

  type SubmissionRow = {
    user_id: string;
    value: number;
    rx: boolean;
    workout_id: string;
    profiles: { name: string };
  };

  const { data: subsRaw } = await supabase
    .from("submissions")
    .select("user_id, value, rx, workout_id, profiles!submissions_user_id_fkey(name)")
    .in(
      "workout_id",
      allWorkouts.map((w) => w.id)
    );

  const submissions = (subsRaw ?? []) as unknown as SubmissionRow[];

  const profileMap = new Map<string, string>();
  for (const s of submissions) {
    if (!profileMap.has(s.user_id)) profileMap.set(s.user_id, s.profiles.name);
  }

  const leaderboard = computeLeaderboard(allWorkouts, submissions);
  const top = leaderboard.slice(0, 7);
  const top3 = top.slice(0, 3);
  const rest = top.slice(3);

  const weeksCount = allWorkouts.length;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#09090b",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 48px 22px",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#fafafa",
              letterSpacing: "-0.5px",
            }}
          >
            WOD COMP
          </span>
          {group.name && (
            <>
              <span style={{ color: "#3f3f46", margin: "0 12px", fontSize: 22 }}>·</span>
              <span style={{ fontSize: 20, color: "#71717a", fontWeight: 500 }}>{group.name}</span>
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#f59e0b",
              letterSpacing: "2.5px",
            }}
          >
            ALL-TIME LEADERBOARD
          </span>
          <span style={{ fontSize: 14, color: "#52525b", marginTop: 4 }}>
            {weeksCount} {weeksCount === 1 ? "week" : "weeks"} of competition
          </span>
        </div>
      </div>

      {/* Top 3 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "8px 40px",
          justifyContent: "center",
        }}
      >
        {top3.map((entry, i) => (
          <div
            key={entry.user_id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: i === 0 ? "14px 12px" : "10px 12px",
              borderRadius: 8,
              marginBottom: i < top3.length - 1 ? 4 : 0,
              background: i === 0 ? "rgba(245,158,11,0.08)" : "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 36, width: 52 }}>{MEDALS[i]}</span>
              <span
                style={{
                  fontSize: i === 0 ? 30 : 24,
                  fontWeight: i === 0 ? 800 : 500,
                  color: i === 0 ? "#fafafa" : "#d4d4d8",
                  marginLeft: 8,
                }}
              >
                {profileMap.get(entry.user_id) ?? "Unknown"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ fontSize: 14, color: "#52525b" }}>
                {entry.participated}W
                {entry.wins > 0 && (
                  <span style={{ color: "#f59e0b", marginLeft: 8 }}>
                    {entry.wins} {entry.wins === 1 ? "win" : "wins"}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: i === 0 ? 28 : 22,
                  fontWeight: 700,
                  color: i === 0 ? "#f59e0b" : "#71717a",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 80,
                  textAlign: "right",
                }}
              >
                {entry.points} pts
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: 4th–7th and athlete count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 52px 24px",
          borderTop: "1px solid #27272a",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", flex: 1 }}>
          {rest.map((entry, i) => (
            <span
              key={entry.user_id}
              style={{
                fontSize: 15,
                color: "#52525b",
                marginRight: 28,
              }}
            >
              {i + 4}.{" "}
              <span style={{ color: "#71717a" }}>{profileMap.get(entry.user_id) ?? "Unknown"}</span>{" "}
              <span style={{ color: "#3f3f46" }}>{entry.points} pts</span>
            </span>
          ))}
        </div>
        <span style={{ fontSize: 14, color: "#3f3f46", whiteSpace: "nowrap" }}>
          {leaderboard.length} {leaderboard.length === 1 ? "athlete" : "athletes"}
        </span>
      </div>
    </div>,
    { ...size }
  );
}
