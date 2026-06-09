// Jan 5 1970 was the first Monday after Unix epoch
const EPOCH_MONDAY_MS = new Date("1970-01-05").getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getWeekStart(date: Date = new Date(), tz = "UTC"): Date {
  const localDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
  const [y, m, d] = localDateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  return new Date(Date.UTC(y, m - 1, d + offsetToMonday));
}

export function formatWeekStart(date: Date = new Date(), tz = "UTC"): string {
  const d = getWeekStart(date, tz);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// members must be pre-sorted by rotation_order ascending — callers are responsible
export function getWeekSetter(
  members: { id: string; rotation_order: number }[],
  referenceDate: Date = new Date(),
  tz = "UTC"
): string | null {
  if (members.length === 0) return null;
  const weekIndex = Math.floor(
    (getWeekStart(referenceDate, tz).getTime() - EPOCH_MONDAY_MS) / WEEK_MS
  );
  return members[((weekIndex % members.length) + members.length) % members.length].id;
}
