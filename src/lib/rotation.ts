// Jan 5 1970 was the first Monday after Unix epoch
const EPOCH_MONDAY_MS = new Date("1970-01-05").getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekStart(date: Date = new Date()): string {
  const d = getWeekStart(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWeekSetter(
  members: { id: string; joined_at: string }[],
  referenceDate: Date = new Date()
): string | null {
  if (members.length === 0) return null;

  const sorted = [...members].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  );

  const weekIndex = Math.floor((getWeekStart(referenceDate).getTime() - EPOCH_MONDAY_MS) / WEEK_MS);

  return sorted[((weekIndex % sorted.length) + sorted.length) % sorted.length].id;
}
