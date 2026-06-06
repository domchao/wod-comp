import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { getWeekSetter } from "@/lib/rotation";

export const dynamic = "force-dynamic";
export const alt = "Workout of the Week — WOD Comp";
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

const METRIC_LABELS: Record<string, string> = {
  time: "FOR TIME",
  reps: "MAX REPS",
  weight: "MAX WEIGHT",
  rounds: "AMRAP",
};

const METRIC_COLORS: Record<string, { bg: string; text: string }> = {
  time: { bg: "#78350f", text: "#fcd34d" },
  reps: { bg: "#14532d", text: "#86efac" },
  weight: { bg: "#3b0764", text: "#d8b4fe" },
  rounds: { bg: "#1e3a8a", text: "#93c5fd" },
};

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

export default async function Image({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  const supabase = anonClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("title, description, metric_type, week_start_date, group_id")
    .eq("id", workoutId)
    .single();

  if (!workout) {
    return new ImageResponse(<Fallback />, { ...size });
  }

  const [{ data: group }, { data: override }, { data: membersRaw }] = await Promise.all([
    supabase.from("groups").select("name, timezone").eq("id", workout.group_id).single(),
    supabase
      .from("setter_overrides")
      .select("user_id")
      .eq("group_id", workout.group_id)
      .eq("week_start_date", workout.week_start_date)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("rotation_order, profiles(id, name)")
      .eq("group_id", workout.group_id)
      .order("rotation_order", { ascending: true }),
  ]);

  type Member = { rotation_order: number; profiles: { id: string; name: string } };
  const members = (membersRaw ?? []) as unknown as Member[];

  const [wy, wm, wd] = workout.week_start_date.split("-").map(Number);
  const setterId =
    override?.user_id ??
    getWeekSetter(
      members.map((m) => ({ id: m.profiles.id, rotation_order: m.rotation_order })),
      new Date(Date.UTC(wy, wm - 1, wd)),
      group?.timezone ?? "UTC"
    );
  const setterName = members.find((m) => m.profiles.id === setterId)?.profiles.name ?? "";

  const weekLabel = formatWeekLabel(workout.week_start_date);
  const metricLabel = METRIC_LABELS[workout.metric_type] ?? workout.metric_type.toUpperCase();
  const metricColor = METRIC_COLORS[workout.metric_type] ?? { bg: "#27272a", text: "#a1a1aa" };

  const descLines = (workout.description ?? "").split("\n").filter((l: string) => l.trim());
  const descPreview = descLines.slice(0, 2).join("\n") + (descLines.length > 2 ? "\n…" : "");

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
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          background: metricColor.text,
          display: "flex",
          opacity: 0.7,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "32px 48px 28px 60px",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#fafafa",
              letterSpacing: "-0.5px",
            }}
          >
            WOD COMP
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#3b82f6",
              letterSpacing: "2.5px",
              marginTop: 6,
            }}
          >
            WORKOUT OF THE WEEK
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: 18, color: "#71717a", fontWeight: 500 }}>
            Week of {weekLabel}
          </span>
          {group?.name && (
            <span style={{ fontSize: 15, color: "#52525b", marginTop: 4 }}>{group.name}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 48px 40px 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark */}
        <div
          style={{
            position: "absolute",
            bottom: -10,
            right: 40,
            fontSize: 200,
            fontWeight: 900,
            color: "#ffffff",
            opacity: 0.03,
            letterSpacing: "-4px",
            lineHeight: 1,
            display: "flex",
          }}
        >
          {metricLabel}
        </div>

        <div
          style={{
            fontSize: workout.title.length > 40 ? 52 : 68,
            fontWeight: 800,
            color: "#fafafa",
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            marginBottom: 20,
          }}
        >
          {workout.title}
        </div>
        {descPreview && (
          <div
            style={{
              fontSize: 22,
              color: "#a1a1aa",
              lineHeight: 1.55,
              maxWidth: 960,
              whiteSpace: "pre-line",
            }}
          >
            {descPreview}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px 32px 60px",
          borderTop: "1px solid #27272a",
        }}
      >
        <div
          style={{
            background: metricColor.bg,
            color: metricColor.text,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "2px",
            padding: "8px 20px",
            borderRadius: 6,
          }}
        >
          {metricLabel}
        </div>
        {setterName && (
          <span style={{ fontSize: 18, color: "#71717a" }}>
            Set by <span style={{ color: "#d4d4d8", fontWeight: 600 }}>{setterName}</span>
          </span>
        )}
      </div>
    </div>,
    { ...size }
  );
}
