import Link from "next/link";

function formatWeekLabel(weekStr: string): string {
  const [y, m, d] = weekStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function WeekNav({
  groupId,
  weekStr,
  prevWeek,
  nextWeek,
  isCurrentWeek,
}: {
  groupId: string;
  weekStr: string;
  prevWeek: string | null;
  nextWeek: string | null;
  isCurrentWeek: boolean;
}) {
  const label = isCurrentWeek ? "This week" : `Week of ${formatWeekLabel(weekStr)}`;

  return (
    <div className="flex items-center justify-between">
      {prevWeek ? (
        <Link
          href={`/group/${groupId}?week=${prevWeek}`}
          className="px-1 text-zinc-500 hover:text-zinc-900"
          aria-label="Previous week"
        >
          ←
        </Link>
      ) : (
        <span className="px-1 text-zinc-300" aria-hidden="true">
          ←
        </span>
      )}
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</h2>
      {nextWeek ? (
        <Link
          href={`/group/${groupId}?week=${nextWeek}`}
          className="px-1 text-zinc-500 hover:text-zinc-900"
          aria-label="Next week"
        >
          →
        </Link>
      ) : (
        <span className="px-1 text-zinc-300" aria-hidden="true">
          →
        </span>
      )}
    </div>
  );
}
