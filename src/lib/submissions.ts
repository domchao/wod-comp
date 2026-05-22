export function sortSubmissions<T extends { value: number }>(
  submissions: T[],
  metricType: string
): T[] {
  return [...submissions].sort((a, b) =>
    metricType === "time" ? a.value - b.value : b.value - a.value
  );
}

export function formatValue(value: number, metricType: string): string {
  if (metricType === "time") {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
  if (metricType === "weight") return `${value} kg`;
  if (metricType === "reps") return `${value} reps`;
  if (metricType === "rounds") return `${value} rounds`;
  return String(value);
}
