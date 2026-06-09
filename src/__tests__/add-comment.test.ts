import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addComment } from "@/app/group/[id]/comments/actions";
import { sendPushToGroupMembers } from "@/lib/push";

vi.mock("@/lib/supabase/server");
vi.mock("next/cache");
vi.mock("next/navigation");
vi.mock("@/lib/push", () => ({ sendPushToGroupMembers: vi.fn().mockResolvedValue(undefined) }));

const USER_ID = "user-1";
const WORKOUT_ID = "workout-1";
const GROUP_ID = "group-1";

function buildSupabaseMock({ insertError = null as string | null } = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "comments") {
        return {
          insert: vi
            .fn()
            .mockResolvedValue({ error: insertError ? { message: insertError } : null }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: "Test User" } }),
        };
      }
      return {};
    }),
  };
}

function makeFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("workout_id", WORKOUT_ID);
  fd.set("group_id", GROUP_ID);
  fd.set("body", "Great workout!");
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

describe("addComment", () => {
  it("returns success and revalidates the group path on a valid comment", async () => {
    const result = await addComment(null, makeFormData());

    expect(result).toEqual({ success: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("sends a push notification to group members excluding the commenter", async () => {
    await addComment(null, makeFormData());

    expect(vi.mocked(sendPushToGroupMembers)).toHaveBeenCalledWith(
      GROUP_ID,
      expect.objectContaining({
        title: "New comment",
        body: expect.stringContaining("Test User"),
        url: `/group/${GROUP_ID}`,
      }),
      USER_ID
    );
  });

  it("returns an error when the body is empty", async () => {
    const result = await addComment(null, makeFormData({ body: "" }));
    expect(result).toEqual({ error: "Comment cannot be empty" });
  });

  it("returns an error when the body is only whitespace", async () => {
    const result = await addComment(null, makeFormData({ body: "   " }));
    expect(result).toEqual({ error: "Comment cannot be empty" });
  });

  it("returns an error when the body exceeds 500 characters", async () => {
    const result = await addComment(null, makeFormData({ body: "a".repeat(501) }));
    expect(result).toEqual({ error: "Comment must be 500 characters or fewer" });
  });

  it("accepts a body of exactly 500 characters", async () => {
    const result = await addComment(null, makeFormData({ body: "a".repeat(500) }));
    expect(result).toEqual({ success: true });
  });

  it("returns the error message when the insert fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ insertError: "permission denied" }) as never
    );
    const result = await addComment(null, makeFormData());
    expect(result).toEqual({ error: "permission denied" });
  });

  it("does not revalidate when validation fails", async () => {
    await addComment(null, makeFormData({ body: "" }));
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("does not send a push when validation fails", async () => {
    await addComment(null, makeFormData({ body: "" }));
    expect(vi.mocked(sendPushToGroupMembers)).not.toHaveBeenCalled();
  });
});
