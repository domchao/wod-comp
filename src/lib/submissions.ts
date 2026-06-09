// rounds+reps are packed as: rounds * ROUNDS_MULTIPLIER + reps
// This keeps numeric sort correct: more rounds always beats more reps
export const ROUNDS_MULTIPLIER = 10000;

export function encodeRoundsReps(rounds: number, reps: number): number {
  return rounds * ROUNDS_MULTIPLIER + reps;
}

export function decodeRoundsReps(value: number): { rounds: number; reps: number } {
  return { rounds: Math.floor(value / ROUNDS_MULTIPLIER), reps: value % ROUNDS_MULTIPLIER };
}

export function sortSubmissions<T extends { value: number; rx: boolean }>(
  submissions: T[],
  metricType: string
): T[] {
  return [...submissions].sort((a, b) => {
    if (a.rx !== b.rx) return a.rx ? -1 : 1;
    return metricType === "time" ? a.value - b.value : b.value - a.value;
  });
}

export function formatValue(value: number, metricType: string): string {
  if (metricType === "time") {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
  if (metricType === "weight") return `${value} kg`;
  if (metricType === "reps") return `${value} reps`;
  if (metricType === "rounds") {
    const { rounds, reps } = decodeRoundsReps(value);
    return reps > 0 ? `${rounds} rounds + ${reps} reps` : `${rounds} rounds`;
  }
  return String(value);
}
