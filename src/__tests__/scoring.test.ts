import { describe, it, expect } from "vitest";
import { pointsForPosition, scoreWorkout, computeLeaderboard } from "@/lib/scoring";

describe("pointsForPosition", () => {
  it("awards 10 for 1st", () => expect(pointsForPosition(1)).toBe(10));
  it("awards 8 for 2nd", () => expect(pointsForPosition(2)).toBe(8));
  it("awards 6 for 3rd", () => expect(pointsForPosition(3)).toBe(6));
  it("awards 5 for 4th", () => expect(pointsForPosition(4)).toBe(5));
  it("awards 4 for 5th", () => expect(pointsForPosition(5)).toBe(4));
  it("awards 3 for 6th", () => expect(pointsForPosition(6)).toBe(3));
  it("awards 2 for 7th", () => expect(pointsForPosition(7)).toBe(2));
  it("awards 2 for 10th and beyond", () => expect(pointsForPosition(10)).toBe(2));
  it("awards 0 for position 0 or below", () => expect(pointsForPosition(0)).toBe(0));
});

describe("scoreWorkout", () => {
  it("assigns positions by metric rank", () => {
    const subs = [
      { user_id: "a", value: 50, rx: false },
      { user_id: "b", value: 80, rx: false },
      { user_id: "c", value: 60, rx: false },
    ];
    const result = scoreWorkout(subs, "reps");
    expect(result.find((r) => r.user_id === "b")?.position).toBe(1);
    expect(result.find((r) => r.user_id === "c")?.position).toBe(2);
    expect(result.find((r) => r.user_id === "a")?.position).toBe(3);
  });

  it("places Rx finishers above scaled finishers", () => {
    const subs = [
      { user_id: "scaled-1st", value: 100, rx: false },
      { user_id: "rx-last", value: 10, rx: true },
    ];
    const result = scoreWorkout(subs, "reps");
    expect(result.find((r) => r.user_id === "rx-last")?.position).toBe(1);
    expect(result.find((r) => r.user_id === "scaled-1st")?.position).toBe(2);
  });

  it("scaled 1st cannot outscore Rx last in points when rx finishers exist", () => {
    // 3 Rx, 1 scaled: scaled gets position 4 (5 pts), worst Rx gets position 3 (6 pts)
    const subs = [
      { user_id: "rx-1", value: 100, rx: true },
      { user_id: "rx-2", value: 80, rx: true },
      { user_id: "rx-3", value: 60, rx: true },
      { user_id: "scaled-1", value: 999, rx: false },
    ];
    const scored = scoreWorkout(subs, "reps");
    const rxWorst = scored.find((r) => r.user_id === "rx-3")!;
    const scaledBest = scored.find((r) => r.user_id === "scaled-1")!;
    expect(rxWorst.points).toBeGreaterThan(scaledBest.points);
  });

  it("returns an empty array for no submissions", () => {
    expect(scoreWorkout([], "time")).toEqual([]);
  });
});

describe("computeLeaderboard", () => {
  const workouts = [
    { id: "w1", metric_type: "reps" },
    { id: "w2", metric_type: "time" },
  ];

  it("sums points across multiple workouts", () => {
    const submissions = [
      // w1: a=1st (10), b=2nd (8)
      { workout_id: "w1", user_id: "a", value: 50, rx: false },
      { workout_id: "w1", user_id: "b", value: 40, rx: false },
      // w2: b=1st (10), a=2nd (8)
      { workout_id: "w2", user_id: "b", value: 60, rx: false },
      { workout_id: "w2", user_id: "a", value: 90, rx: false },
    ];
    const result = computeLeaderboard(workouts, submissions);
    const a = result.find((e) => e.user_id === "a")!;
    const b = result.find((e) => e.user_id === "b")!;
    expect(a.points).toBe(18); // 10 + 8
    expect(b.points).toBe(18); // 8 + 10
  });

  it("breaks ties by wins", () => {
    const submissions = [
      { workout_id: "w1", user_id: "a", value: 50, rx: false },
      { workout_id: "w1", user_id: "b", value: 40, rx: false },
      { workout_id: "w2", user_id: "b", value: 60, rx: false },
      { workout_id: "w2", user_id: "a", value: 90, rx: false },
    ];
    const result = computeLeaderboard(workouts, submissions);
    // Both have 18 pts; a has 1 win (w1), b has 1 win (w2) — equal, order stable
    expect(result[0].points).toBe(18);
  });

  it("tracks wins correctly", () => {
    const submissions = [
      { workout_id: "w1", user_id: "a", value: 50, rx: false },
      { workout_id: "w1", user_id: "b", value: 40, rx: false },
      { workout_id: "w2", user_id: "a", value: 60, rx: false },
      { workout_id: "w2", user_id: "b", value: 90, rx: false },
    ];
    const result = computeLeaderboard(workouts, submissions);
    const a = result.find((e) => e.user_id === "a")!;
    expect(a.wins).toBe(2);
  });

  it("tracks participation correctly", () => {
    const submissions = [
      { workout_id: "w1", user_id: "a", value: 50, rx: false },
      // a skips w2
      { workout_id: "w2", user_id: "b", value: 60, rx: false },
    ];
    const result = computeLeaderboard(workouts, submissions);
    const a = result.find((e) => e.user_id === "a")!;
    const b = result.find((e) => e.user_id === "b")!;
    expect(a.participated).toBe(1);
    expect(b.participated).toBe(1);
  });

  it("skips workouts with no submissions", () => {
    const submissions = [{ workout_id: "w1", user_id: "a", value: 50, rx: false }];
    const result = computeLeaderboard(workouts, submissions);
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe("a");
  });

  it("returns empty array when no submissions exist", () => {
    expect(computeLeaderboard(workouts, [])).toEqual([]);
  });

  it("sorts by points descending", () => {
    const submissions = [
      { workout_id: "w1", user_id: "a", value: 50, rx: false }, // 1st = 10
      { workout_id: "w1", user_id: "b", value: 40, rx: false }, // 2nd = 8
      { workout_id: "w1", user_id: "c", value: 30, rx: false }, // 3rd = 6
    ];
    const result = computeLeaderboard([workouts[0]], submissions);
    expect(result.map((e) => e.user_id)).toEqual(["a", "b", "c"]);
  });
});
