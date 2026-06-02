import { sortSubmissions } from "./submissions";

// Points by finish position; 7th place and beyond earn 2
const POINTS = [10, 8, 6, 5, 4, 3];

export function pointsForPosition(position: number): number {
  if (position <= 0) return 0;
  return POINTS[position - 1] ?? 2;
}

export function scoreWorkout(
  submissions: { user_id: string; value: number; rx: boolean }[],
  metricType: string
): { user_id: string; points: number; position: number }[] {
  const sorted = sortSubmissions(submissions, metricType);
  return sorted.map((s, i) => ({
    user_id: s.user_id,
    points: pointsForPosition(i + 1),
    position: i + 1,
  }));
}

export type LeaderboardEntry = {
  user_id: string;
  points: number;
  wins: number;
  participated: number;
};

export function computeLeaderboard(
  workouts: { id: string; metric_type: string }[],
  submissions: { workout_id: string; user_id: string; value: number; rx: boolean }[]
): LeaderboardEntry[] {
  const totals = new Map<string, { points: number; wins: number; participated: number }>();

  for (const workout of workouts) {
    const forWorkout = submissions.filter((s) => s.workout_id === workout.id);
    if (forWorkout.length === 0) continue;
    const scored = scoreWorkout(forWorkout, workout.metric_type);
    for (const { user_id, points, position } of scored) {
      const curr = totals.get(user_id) ?? { points: 0, wins: 0, participated: 0 };
      totals.set(user_id, {
        points: curr.points + points,
        wins: curr.wins + (position === 1 ? 1 : 0),
        participated: curr.participated + 1,
      });
    }
  }

  return [...totals.entries()]
    .map(([user_id, stats]) => ({ user_id, ...stats }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);
}
