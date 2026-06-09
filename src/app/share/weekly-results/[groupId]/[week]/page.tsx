import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { AutoRedirect } from "@/app/share/_components/AutoRedirect";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string; week: string }>;
}): Promise<Metadata> {
  const { groupId, week } = await params;
  const supabase = anonClient();
  const { data: group } = await supabase.from("groups").select("name").eq("id", groupId).single();

  const weekLabel = formatWeekLabel(week);
  return {
    title: group?.name
      ? `${group.name} — Week of ${weekLabel} — WOD Comp`
      : `Weekly Results — WOD Comp`,
    description: `WOD Comp results for the week of ${weekLabel}`,
  };
}

export default async function WeeklyResultsSharePage({
  params,
}: {
  params: Promise<{ groupId: string; week: string }>;
}) {
  const { groupId, week } = await params;
  const dest = `/group/${groupId}?week=${week}`;

  return (
    <>
      <AutoRedirect to={dest} />
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <a href={dest} className="text-zinc-400 text-sm hover:text-zinc-200">
          Open WOD Comp →
        </a>
      </main>
    </>
  );
}
