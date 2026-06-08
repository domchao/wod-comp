import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { AutoRedirect } from "@/app/share/_components/AutoRedirect";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const supabase = anonClient();
  const { data: group } = await supabase.from("groups").select("name").eq("id", groupId).single();

  return {
    title: group?.name
      ? `${group.name} — All-Time Leaderboard — WOD Comp`
      : "Leaderboard — WOD Comp",
    description: group?.name
      ? `All-time standings for ${group.name} on WOD Comp`
      : "All-time standings on WOD Comp",
  };
}

export default async function LeaderboardSharePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const dest = `/group/${groupId}/leaderboard`;

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
