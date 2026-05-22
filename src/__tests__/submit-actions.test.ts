import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { submitResult } from "@/app/group/[id]/submit/actions";

vi.mock("@/lib/supabase/server");
vi.mock("next/navigation");

const USER_ID = "user-1";
const GROUP_ID = "group-1";
const WORKOUT_ID = "workout-1";

function buildSupabaseMock({ isMember = true, upsertError = null as string | null } = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "group_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: isMember ? { user_id: USER_ID } : null }),
        };
      }
      if (table === "submissions") {
        return {
          upsert: vi
            .fn()
            .mockResolvedValue({ error: upsertError ? { message: upsertError } : null }),
        };
      }
      return {};
    }),
  };
}

function makeFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("group_id", GROUP_ID);
  fd.set("workout_id", WORKOUT_ID);
  fd.set("value", "45");
  for (const [key, val] of Object.entries(overrides)) fd.set(key, val);
  return fd;
}

function makeTimeFormData(
  minutes: string,
  seconds: string,
  overrides: Record<string, string> = {}
) {
  const fd = new FormData();
  fd.set("group_id", GROUP_ID);
  fd.set("workout_id", WORKOUT_ID);
  fd.set("minutes", minutes);
  fd.set("seconds", seconds);
  for (const [key, val] of Object.entries(overrides)) fd.set(key, val);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error("redirect");
  });
});

describe("submitResult", () => {
  describe("non-time metric (value field)", () => {
    it("redirects to group page on success", async () => {
      await expect(submitResult(null, makeFormData())).rejects.toThrow("redirect");
      expect(vi.mocked(redirect)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
    });

    it("returns an error for a negative value", async () => {
      const result = await submitResult(null, makeFormData({ value: "-1" }));
      expect(result).toEqual({ error: "Please enter a valid result" });
    });

    it("returns an error for a non-numeric value", async () => {
      const result = await submitResult(null, makeFormData({ value: "abc" }));
      expect(result).toEqual({ error: "Please enter a valid result" });
    });
  });

  describe("time metric (minutes + seconds fields)", () => {
    it("combines minutes and seconds into total seconds and redirects", async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "group_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: USER_ID } }),
            };
          }
          if (table === "submissions") return { upsert: upsertSpy };
          return {};
        }),
      } as never);

      await expect(submitResult(null, makeTimeFormData("2", "30"))).rejects.toThrow("redirect");

      // 2 minutes + 30 seconds = 150 seconds
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ value: 150 }),
        expect.anything()
      );
    });

    it("returns an error when seconds exceed 59", async () => {
      const result = await submitResult(null, makeTimeFormData("1", "60"));
      expect(result).toEqual({ error: "Please enter a valid time" });
    });

    it("returns an error for negative seconds", async () => {
      const result = await submitResult(null, makeTimeFormData("1", "-1"));
      expect(result).toEqual({ error: "Please enter a valid time" });
    });

    it("returns an error for negative minutes", async () => {
      const result = await submitResult(null, makeTimeFormData("-1", "30"));
      expect(result).toEqual({ error: "Please enter a valid time" });
    });
  });

  describe("authorization", () => {
    it("returns an error when the user is not a group member", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ isMember: false }) as never);

      const result = await submitResult(null, makeFormData());
      expect(result).toEqual({ error: "You are not a member of this group" });
      expect(vi.mocked(redirect)).not.toHaveBeenCalled();
    });
  });

  describe("database errors", () => {
    it("returns the error message when upsert fails", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabaseMock({ upsertError: "unique violation" }) as never
      );

      const result = await submitResult(null, makeFormData());
      expect(result).toEqual({ error: "unique violation" });
    });
  });
});
