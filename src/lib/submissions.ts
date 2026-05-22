export function sortSubmissions<T extends { value: number }>(
  submissions: T[],
  metricType: string
): T[] {
  return [...submissions].sort((a, b) =>
    metricType === "time" ? a.value - b.value : b.value - a.value
  );
}
