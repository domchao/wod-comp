import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { sortSubmissions, formatValue } from "@/lib/submissions";

export const dynamic = "force-dynamic";
export const alt = "My Result — WOD Comp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const POSITION_COLORS: Record<number, string> = {
  1: "#f59e0b",
  2: "#94a3b8",
  3: "#d97706",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        color: "#fafafa",
        fontSize: 48,
        fontWeight: 800,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      WOD Comp
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const supabase = anonClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select(
      `id, value, rx, user_id, workout_id,
       profiles!submissions_user_id_fkey(name),
       workouts!inner(title, metric_type, week_start_date, group_id, groups!inner(name))`
    )
    .eq("id", submissionId)
    .single();

  type SubWithJoins = {
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

  if (!sub) {
    return new ImageResponse(<Fallback />, { ...size });
  }

  const typed = sub as unknown as SubWithJoins;
  const workout = typed.workouts;
  const userName = typed.profiles.name;
  const groupName = workout.groups.name;

  const { data: allSubsRaw } = await supabase
    .from("submissions")
    .select("user_id, value, rx")
    .eq("workout_id", typed.workout_id);

  type SubRow = { user_id: string; value: number; rx: boolean };
  const allSubs = (allSubsRaw ?? []) as SubRow[];
  const sorted = sortSubmissions(allSubs, workout.metric_type);
  const position = sorted.findIndex((s) => s.user_id === typed.user_id) + 1;

  const medal = MEDALS[position];
  const positionLabel = ordinal(position) + " place";
  const positionColor = POSITION_COLORS[position] ?? "#71717a";
  const score = formatValue(typed.value, workout.metric_type);
  const weekLabel = formatWeekLabel(workout.week_start_date);

  const glowColors: Record<number, string> = { 1: "#f59e0b", 2: "#94a3b8", 3: "#cd7c0e" };
  const glowColor = glowColors[position] ?? "#52525b";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#09090b",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 4,
          background: positionColor,
          display: "flex",
        }}
      />

      {/* Radial glow behind body */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: glowColor,
          opacity: 0.09,
          filter: "blur(120px)",
          transform: "translate(-50%, -50%)",
          display: "flex",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "36px 48px 28px",
        }}
      >
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
        <span style={{ fontSize: 15, color: "#52525b", fontWeight: 500 }}>{groupName}</span>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#52525b",
            letterSpacing: "3px",
            marginBottom: 16,
          }}
        >
          MY RESULT
        </div>

        {medal && <div style={{ fontSize: 120, lineHeight: 1, marginBottom: 16 }}>{medal}</div>}

        <div
          style={{
            fontSize: userName.length > 20 ? 52 : 68,
            fontWeight: 800,
            color: "#fafafa",
            letterSpacing: "-1.5px",
            lineHeight: 1,
            marginBottom: 20,
            textTransform: "uppercase",
          }}
        >
          {userName}
        </div>

        {/* Position pill badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: `${positionColor}22`,
            border: `1px solid ${positionColor}55`,
            borderRadius: 100,
            padding: "6px 20px",
            marginBottom: 28,
          }}
        >
          <span
            style={{ fontSize: 18, fontWeight: 700, color: positionColor, letterSpacing: "0.5px" }}
          >
            {positionLabel}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#fafafa",
              letterSpacing: "-0.5px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {score}
          </span>
          {typed.rx && (
            <div
              style={{
                background: "#14532d",
                color: "#86efac",
                fontSize: 18,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 6,
                letterSpacing: "1px",
              }}
            >
              Rx
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 48px 32px",
          borderTop: "1px solid #1c1c1f",
        }}
      >
        <span style={{ fontSize: 17, color: "#52525b" }}>
          {workout.title}
          <span style={{ color: "#3f3f46", margin: "0 12px" }}>·</span>
          Week of {weekLabel}
        </span>
      </div>
    </div>,
    { ...size }
  );
}
