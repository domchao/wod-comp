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
  const description = workout.description
    ? workout.description.length > 180
      ? workout.description.slice(0, 177) + "…"
      : workout.description
    : "";

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
          padding: "32px 48px 28px",
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
          padding: "40px 48px",
        }}
      >
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
        {description && (
          <div
            style={{
              fontSize: 22,
              color: "#a1a1aa",
              lineHeight: 1.55,
              maxWidth: 960,
            }}
          >
            {description}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px 32px",
          borderTop: "1px solid #27272a",
        }}
      >
        <div
          style={{
            background: "#1e3a8a",
            color: "#93c5fd",
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
