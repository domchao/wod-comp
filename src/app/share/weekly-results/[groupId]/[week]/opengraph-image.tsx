import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { sortSubmissions, formatValue } from "@/lib/submissions";

export const dynamic = "force-dynamic";
export const alt = "Weekly Results — WOD Comp";
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

const MEDALS = ["🥇", "🥈", "🥉"];

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
        <div
          style={{
            fontSize: 24,
            color: "#71717a",
            marginTop: 16,
            display: "flex",
          }}
        >
          {groupName}
        </div>
      )}
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ groupId: string; week: string }>;
}) {
  const { groupId, week } = await params;
  const supabase = anonClient();

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
    return new ImageResponse(<Fallback groupName={group?.name} />, { ...size });
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

  const weekLabel = formatWeekLabel(week);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, 7);

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
          {group?.name && (
            <>
              <span style={{ color: "#3f3f46", margin: "0 12px", fontSize: 22 }}>·</span>
              <span style={{ fontSize: 20, color: "#71717a", fontWeight: 500 }}>{group.name}</span>
            </>
          )}
        </div>
        <span style={{ fontSize: 16, color: "#52525b" }}>Week of {weekLabel}</span>
      </div>

      {/* Section heading + workout title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "20px 48px 12px",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#3b82f6",
            letterSpacing: "2.5px",
            marginBottom: 6,
          }}
        >
          WEEKLY RESULTS
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#a1a1aa",
          }}
        >
          {workout.title}
        </span>
      </div>

      {/* Top 3 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 48px",
          justifyContent: "center",
        }}
      >
        {top3.map((sub, i) => (
          <div
            key={sub.user_id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: i === 0 ? "14px 0 12px" : "10px 0",
              borderBottom: i < top3.length - 1 ? "1px solid #18181b" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 28, width: 44 }}>{MEDALS[i]}</span>
              <span
                style={{
                  fontSize: i === 0 ? 30 : 24,
                  fontWeight: i === 0 ? 700 : 500,
                  color: i === 0 ? "#fafafa" : "#d4d4d8",
                  marginLeft: 8,
                }}
              >
                {sub.profiles.name}
              </span>
              {sub.rx && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#86efac",
                    background: "#14532d",
                    padding: "3px 8px",
                    borderRadius: 4,
                    marginLeft: 10,
                  }}
                >
                  Rx
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: i === 0 ? 26 : 22,
                fontWeight: 600,
                color: i === 0 ? "#f59e0b" : "#71717a",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatValue(sub.value, workout.metric_type)}
            </span>
          </div>
        ))}
      </div>

      {/* 4th place and beyond */}
      {rest.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 48px 24px",
            borderTop: "1px solid #27272a",
            flexWrap: "wrap",
          }}
        >
          {rest.map((sub, i) => (
            <span
              key={sub.user_id}
              style={{
                fontSize: 15,
                color: "#52525b",
                marginRight: 28,
              }}
            >
              {i + 4}. <span style={{ color: "#71717a" }}>{sub.profiles.name}</span>{" "}
              <span style={{ color: "#3f3f46" }}>
                {formatValue(sub.value, workout.metric_type)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>,
    { ...size }
  );
}
