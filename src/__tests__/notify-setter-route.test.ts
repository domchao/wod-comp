import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToUsers: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rotation", () => ({
  formatWeekStart: vi.fn().mockReturnValue("2026-06-02"),
  getWeekSetter: vi.fn(),
}));

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";
import { getWeekSetter } from "@/lib/rotation";
import { GET } from "@/app/api/cron/notify-setter/route";

const CRON_SECRET = "test-secret";

const GROUP_A = "group-a";
const GROUP_B = "group-b";
const USER_1 = "user-1";
const USER_2 = "user-2";

function makeRequest(secret: string | null = CRON_SECRET) {
  return new Request("http://localhost/api/cron/notify-setter", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

type GroupRow = {
  id: string;
  timezone: string | null;
  group_members: { user_id: string; rotation_order: number }[];
};

function buildSupabaseMock({
  groups = [] as GroupRow[],
  overrideUserId = null as string | null,
  existingWorkout = false,
} = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "groups") {
        return {
          select: vi.fn().mockResolvedValue({ data: groups }),
        };
      }
      if (table === "setter_overrides") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: overrideUserId ? { user_id: overrideUserId } : null }),
        };
      }
      if (table === "workouts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existingWorkout ? { id: "w-1" } : null }),
        };
      }
      return {};
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  vi.mocked(getWeekSetter).mockReturnValue(USER_1);
});

describe("GET /api/cron/notify-setter", () => {
  it("returns 401 when authorization header is missing", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(buildSupabaseMock() as never);
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when authorization header has wrong secret", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(buildSupabaseMock() as never);
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns notified: 0 when there are no groups", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(buildSupabaseMock({ groups: [] }) as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notified: 0 });
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("sends a push to the natural setter when no workout exists yet", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        groups: [
          {
            id: GROUP_A,
            timezone: "UTC",
            group_members: [{ user_id: USER_1, rotation_order: 0 }],
          },
        ],
      }) as never
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notified: 1 });
    expect(sendPushToUsers).toHaveBeenCalledWith([USER_1], {
      title: "Your turn to set the workout",
      body: "It's your week to set the workout for your group.",
      url: `/group/${GROUP_A}`,
    });
  });

  it("skips a group when a workout has already been posted this week", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        groups: [
          {
            id: GROUP_A,
            timezone: "UTC",
            group_members: [{ user_id: USER_1, rotation_order: 0 }],
          },
        ],
        existingWorkout: true,
      }) as never
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notified: 0 });
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("uses the override setter instead of the natural setter", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        groups: [
          {
            id: GROUP_A,
            timezone: "UTC",
            group_members: [
              { user_id: USER_1, rotation_order: 0 },
              { user_id: USER_2, rotation_order: 1 },
            ],
          },
        ],
        overrideUserId: USER_2,
      }) as never
    );

    const res = await GET(makeRequest());
    expect(await res.json()).toEqual({ notified: 1 });
    expect(sendPushToUsers).toHaveBeenCalledWith([USER_2], expect.any(Object));
  });

  it("skips a group when it has no members", async () => {
    vi.mocked(getWeekSetter).mockReturnValue(null);
    vi.mocked(createSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        groups: [{ id: GROUP_A, timezone: "UTC", group_members: [] }],
      }) as never
    );

    const res = await GET(makeRequest());
    expect(await res.json()).toEqual({ notified: 0 });
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("notifies setters across multiple groups independently", async () => {
    vi.mocked(getWeekSetter).mockReturnValueOnce(USER_1).mockReturnValueOnce(USER_2);
    vi.mocked(createSupabaseClient).mockReturnValue(
      buildSupabaseMock({
        groups: [
          {
            id: GROUP_A,
            timezone: "UTC",
            group_members: [{ user_id: USER_1, rotation_order: 0 }],
          },
          {
            id: GROUP_B,
            timezone: "Europe/London",
            group_members: [{ user_id: USER_2, rotation_order: 0 }],
          },
        ],
      }) as never
    );

    const res = await GET(makeRequest());
    expect(await res.json()).toEqual({ notified: 2 });
    expect(sendPushToUsers).toHaveBeenCalledTimes(2);
    expect(sendPushToUsers).toHaveBeenCalledWith(
      [USER_1],
      expect.objectContaining({ url: `/group/${GROUP_A}` })
    );
    expect(sendPushToUsers).toHaveBeenCalledWith(
      [USER_2],
      expect.objectContaining({ url: `/group/${GROUP_B}` })
    );
  });
});
