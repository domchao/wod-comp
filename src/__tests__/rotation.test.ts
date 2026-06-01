import { describe, it, expect } from "vitest";
import { getWeekStart, getWeekSetter, formatWeekStart } from "@/lib/rotation";

// Verified calendar dates for 2026:
// May 18 = Monday, May 20 = Wednesday, May 23 = Saturday, May 24 = Sunday
// May 25 = Monday, Jun 1 = Monday, Jun 8 = Monday

const MON_18_MAY = new Date("2026-05-18T12:00:00");
const WED_20_MAY = new Date("2026-05-20T12:00:00");
const SAT_23_MAY = new Date("2026-05-23T12:00:00");
const SUN_24_MAY = new Date("2026-05-24T12:00:00");
const MON_25_MAY = new Date("2026-05-25T12:00:00");
const MON_01_JUN = new Date("2026-06-01T12:00:00");
const MON_08_JUN = new Date("2026-06-08T12:00:00");

const members = [
  { id: "alice", joined_at: "2026-01-01T00:00:00Z" },
  { id: "bob", joined_at: "2026-01-02T00:00:00Z" },
  { id: "charlie", joined_at: "2026-01-03T00:00:00Z" },
];

describe("getWeekStart", () => {
  it("returns the same Monday when given a Monday", () => {
    const result = getWeekStart(MON_18_MAY);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(4); // May (0-indexed)
    expect(result.getUTCDate()).toBe(18);
  });

  it("returns the Monday of the week when given a Wednesday", () => {
    const result = getWeekStart(WED_20_MAY);
    expect(result.getUTCDate()).toBe(18);
  });

  it("returns the Monday of the week when given a Saturday", () => {
    const result = getWeekStart(SAT_23_MAY);
    expect(result.getUTCDate()).toBe(18);
  });

  it("returns the previous Monday when given a Sunday", () => {
    // Sunday May 24 → Monday May 18 (not May 25)
    const result = getWeekStart(SUN_24_MAY);
    expect(result.getUTCDate()).toBe(18);
  });

  it("resets time to midnight UTC", () => {
    const result = getWeekStart(WED_20_MAY);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});

describe("formatWeekStart", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = formatWeekStart(WED_20_MAY);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the Monday of the given date's week", () => {
    expect(formatWeekStart(MON_18_MAY)).toBe("2026-05-18");
    expect(formatWeekStart(WED_20_MAY)).toBe("2026-05-18");
    expect(formatWeekStart(SUN_24_MAY)).toBe("2026-05-18");
    expect(formatWeekStart(MON_25_MAY)).toBe("2026-05-25");
  });
});

describe("getWeekSetter", () => {
  it("returns null for an empty member list", () => {
    expect(getWeekSetter([], MON_18_MAY)).toBeNull();
  });

  it("always returns the single member regardless of week", () => {
    const single = [{ id: "alice", joined_at: "2026-01-01T00:00:00Z" }];
    expect(getWeekSetter(single, MON_18_MAY)).toBe("alice");
    expect(getWeekSetter(single, MON_25_MAY)).toBe("alice");
    expect(getWeekSetter(single, MON_01_JUN)).toBe("alice");
  });

  it("returns a valid member ID", () => {
    const id = getWeekSetter(members, MON_18_MAY);
    expect(members.map((m) => m.id)).toContain(id);
  });

  it("is deterministic — same week always returns the same member", () => {
    expect(getWeekSetter(members, MON_18_MAY)).toBe(getWeekSetter(members, MON_18_MAY));
    // Mid-week dates in the same week should also match
    expect(getWeekSetter(members, WED_20_MAY)).toBe(getWeekSetter(members, MON_18_MAY));
    expect(getWeekSetter(members, SUN_24_MAY)).toBe(getWeekSetter(members, MON_18_MAY));
  });

  it("rotates to a different member each consecutive week", () => {
    const week1 = getWeekSetter(members, MON_18_MAY);
    const week2 = getWeekSetter(members, MON_25_MAY);
    const week3 = getWeekSetter(members, MON_01_JUN);
    expect(week1).not.toBe(week2);
    expect(week2).not.toBe(week3);
    expect(week1).not.toBe(week3);
  });

  it("wraps around after all members have had a turn", () => {
    // 3 members → week N+3 should return the same member as week N
    const week1 = getWeekSetter(members, MON_18_MAY);
    const week4 = getWeekSetter(members, MON_08_JUN);
    expect(week4).toBe(week1);
  });

  it("sorts by joined_at regardless of input order", () => {
    const shuffled = [members[2], members[0], members[1]];
    expect(getWeekSetter(shuffled, MON_18_MAY)).toBe(getWeekSetter(members, MON_18_MAY));
  });
});
