import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getWeekSetter, formatWeekStart } from "@/lib/rotation";
import { sendPushToUsers } from "@/lib/push";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const now = new Date();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, timezone, group_members(user_id, rotation_order)");

  if (!groups?.length) {
    return NextResponse.json({ notified: 0 });
  }

  let notified = 0;

  for (const group of groups) {
    const tz = (group.timezone as string | null) ?? "UTC";
    const weekStart = formatWeekStart(now, tz);

    const [{ data: overrideRow }, { data: existingWorkout }] = await Promise.all([
      supabase
        .from("setter_overrides")
        .select("user_id")
        .eq("group_id", group.id)
        .eq("week_start_date", weekStart)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select("id")
        .eq("group_id", group.id)
        .eq("week_start_date", weekStart)
        .maybeSingle(),
    ]);

    if (existingWorkout) continue;

    const sortedMembers = (group.group_members as { user_id: string; rotation_order: number }[])
      .slice()
      .sort((a, b) => a.rotation_order - b.rotation_order)
      .map((m) => ({ id: m.user_id, rotation_order: m.rotation_order }));

    const naturalSetterId = getWeekSetter(sortedMembers, now, tz);
    const setterId = (overrideRow as { user_id: string } | null)?.user_id ?? naturalSetterId;

    if (!setterId) continue;

    await sendPushToUsers([setterId], {
      title: "Your turn to set the workout",
      body: "It's your week to set the workout for your group.",
      url: `/group/${group.id}`,
    });

    notified++;
  }

  return NextResponse.json({ notified });
}
