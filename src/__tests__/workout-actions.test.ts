import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWeekSetter } from "@/lib/rotation";
import { createWorkout } from "@/app/group/[id]/workout/actions";

vi.mock("@/lib/supabase/server");
vi.mock("next/navigation");
vi.mock("@/lib/rotation", () => ({
  getWeekSetter: vi.fn(),
  formatWeekStart: vi.fn().mockReturnValue("2026-05-18"),
}));

const USER_ID = "user-1";
const ADMIN_ID = "admin-1";
const GROUP_ID = "group-1";

const mockGroupMembers = [
  { user_id: USER_ID, joined_at: "2026-01-01T00:00:00Z" },
  { user_id: ADMIN_ID, joined_at: "2026-01-02T00:00:00Z" },
];

function buildSupabaseMock({ workoutExists = false, insertError = null as string | null } = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "groups") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { admin_user_id: ADMIN_ID, group_members: mockGroupMembers },
            error: null,
          }),
        };
      }
      if (table === "workouts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: workoutExists ? { id: "w-1" } : null, error: null }),
          insert: vi
            .fn()
            .mockResolvedValue({ error: insertError ? { message: insertError } : null }),
        };
      }
      return {};
    }),
  };
}

function makeFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("group_id", GROUP_ID);
  fd.set("title", "Test workout");
  fd.set("description", "Run 5k");
  fd.set("metric_type", "time");
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

describe("createWorkout", () => {
  it("redirects to the group page when it is the user's turn", async () => {
    vi.mocked(getWeekSetter).mockReturnValue(USER_ID);

    await expect(createWorkout(null, makeFormData())).rejects.toThrow("redirect");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("redirects when the user is admin even if it is not their turn", async () => {
    // Auth returns admin user
    vi.mocked(createClient).mockResolvedValue({
      ...buildSupabaseMock(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID } } }),
      },
    } as never);
    vi.mocked(getWeekSetter).mockReturnValue(USER_ID); // not admin's turn

    await expect(createWorkout(null, makeFormData())).rejects.toThrow("redirect");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("returns an error when it is not the user's turn and user is not admin", async () => {
    vi.mocked(getWeekSetter).mockReturnValue("someone-else");

    const result = await createWorkout(null, makeFormData());
    expect(result).toEqual({ error: "It's not your turn to set the workout this week" });
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("returns an error when a workout already exists for this week", async () => {
    vi.mocked(getWeekSetter).mockReturnValue(USER_ID);
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ workoutExists: true }) as never);

    const result = await createWorkout(null, makeFormData());
    expect(result).toEqual({ error: "A workout has already been posted for this week" });
  });

  it("returns an error when title is missing", async () => {
    vi.mocked(getWeekSetter).mockReturnValue(USER_ID);

    const result = await createWorkout(null, makeFormData({ title: "" }));
    expect(result).toEqual({ error: "Title is required" });
  });

  it("returns an error when metric type is missing", async () => {
    vi.mocked(getWeekSetter).mockReturnValue(USER_ID);

    const result = await createWorkout(null, makeFormData({ metric_type: "" }));
    expect(result).toEqual({ error: "Metric type is required" });
  });
});
