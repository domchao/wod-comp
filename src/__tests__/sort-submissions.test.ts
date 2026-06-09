import { describe, it, expect } from "vitest";
import {
  sortSubmissions,
  formatValue,
  encodeRoundsReps,
  decodeRoundsReps,
} from "@/lib/submissions";

const make = (value: number, rx = false) => ({ value, rx });

describe("sortSubmissions", () => {
  describe("time metric", () => {
    it("sorts ascending — lower time ranks higher", () => {
      const result = sortSubmissions([make(180), make(120), make(150)], "time");
      expect(result.map((s) => s.value)).toEqual([120, 150, 180]);
    });

    it("places the fastest time first", () => {
      const [first] = sortSubmissions([make(300), make(90)], "time");
      expect(first.value).toBe(90);
    });
  });

  describe("reps metric", () => {
    it("sorts descending — more reps ranks higher", () => {
      const result = sortSubmissions([make(30), make(50), make(40)], "reps");
      expect(result.map((s) => s.value)).toEqual([50, 40, 30]);
    });
  });

  describe("weight metric", () => {
    it("sorts descending — heavier weight ranks higher", () => {
      const result = sortSubmissions([make(80), make(100), make(90)], "weight");
      expect(result.map((s) => s.value)).toEqual([100, 90, 80]);
    });
  });

  describe("rounds metric", () => {
    it("sorts descending — more rounds ranks higher", () => {
      const a = encodeRoundsReps(4, 0);
      const b = encodeRoundsReps(6, 0);
      const c = encodeRoundsReps(5, 0);
      const result = sortSubmissions([make(a), make(b), make(c)], "rounds");
      expect(result.map((s) => s.value)).toEqual([b, c, a]);
    });

    it("ranks more rounds over more reps in same fewer-round score", () => {
      const lessRounds = encodeRoundsReps(4, 99);
      const moreRounds = encodeRoundsReps(5, 0);
      const [first] = sortSubmissions([make(lessRounds), make(moreRounds)], "rounds");
      expect(first.value).toBe(moreRounds);
    });

    it("breaks ties in rounds by reps", () => {
      const fewerReps = encodeRoundsReps(5, 3);
      const moreReps = encodeRoundsReps(5, 7);
      const [first] = sortSubmissions([make(fewerReps), make(moreReps)], "rounds");
      expect(first.value).toBe(moreReps);
    });
  });

  it("does not mutate the original array", () => {
    const input = [make(3), make(1), make(2)];
    sortSubmissions(input, "reps");
    expect(input.map((s) => s.value)).toEqual([3, 1, 2]);
  });

  it("handles an empty array", () => {
    expect(sortSubmissions([], "time")).toEqual([]);
  });

  it("handles a single submission", () => {
    expect(sortSubmissions([make(42)], "reps")).toEqual([make(42)]);
  });

  describe("rx ranking", () => {
    it("places Rx submissions above non-Rx regardless of value (reps)", () => {
      const result = sortSubmissions([make(100), make(50, true)], "reps");
      expect(result[0].rx).toBe(true);
      expect(result[1].rx).toBe(false);
    });

    it("places Rx submissions above non-Rx regardless of value (time)", () => {
      const result = sortSubmissions([make(60), make(120, true)], "time");
      expect(result[0].rx).toBe(true);
      expect(result[1].rx).toBe(false);
    });

    it("sorts Rx submissions among themselves by metric", () => {
      const result = sortSubmissions([make(30, true), make(50, true)], "reps");
      expect(result.map((s) => s.value)).toEqual([50, 30]);
    });
  });
});

describe("formatValue", () => {
  describe("time", () => {
    it("formats whole minutes and seconds", () => {
      expect(formatValue(150, "time")).toBe("2m 30s");
    });

    it("formats seconds only when under a minute", () => {
      expect(formatValue(45, "time")).toBe("45s");
    });

    it("formats exactly one minute", () => {
      expect(formatValue(60, "time")).toBe("1m 0s");
    });

    it("formats zero seconds", () => {
      expect(formatValue(0, "time")).toBe("0s");
    });
  });

  it("appends 'reps' for reps metric", () => {
    expect(formatValue(42, "reps")).toBe("42 reps");
  });

  it("appends 'kg' for weight metric", () => {
    expect(formatValue(100, "weight")).toBe("100 kg");
  });

  describe("rounds metric", () => {
    it("formats rounds with zero reps as 'N rounds'", () => {
      expect(formatValue(encodeRoundsReps(5, 0), "rounds")).toBe("5 rounds");
    });

    it("formats rounds and reps as 'N rounds + M reps'", () => {
      expect(formatValue(encodeRoundsReps(3, 6), "rounds")).toBe("3 rounds + 6 reps");
    });
  });

  it("returns the raw value as a string for an unknown metric", () => {
    expect(formatValue(99, "unknown")).toBe("99");
  });
});

describe("encodeRoundsReps / decodeRoundsReps", () => {
  it("round-trips rounds and reps", () => {
    expect(decodeRoundsReps(encodeRoundsReps(3, 6))).toEqual({ rounds: 3, reps: 6 });
    expect(decodeRoundsReps(encodeRoundsReps(10, 0))).toEqual({ rounds: 10, reps: 0 });
    expect(decodeRoundsReps(encodeRoundsReps(0, 15))).toEqual({ rounds: 0, reps: 15 });
  });

  it("preserves correct sort order: more rounds beats more reps", () => {
    const fiveRoundsMax = encodeRoundsReps(5, 9999);
    const sixRoundsZero = encodeRoundsReps(6, 0);
    expect(sixRoundsZero).toBeGreaterThan(fiveRoundsMax);
  });
});
