import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateSetterOverride, clearSetterOverride } from "@/app/group/[id]/setter/actions";

vi.mock("@/lib/supabase/server");
vi.mock("next/cache");
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const USER_ID = "user-1";
const GROUP_ID = "group-1";
const WEEK = "2026-05-25";
const TARGET_USER = "user-2";

function buildSupabaseMock({
  adminUserId = USER_ID,
  groupFound = true,
  writeError = null as string | null,
} = {}) {
  const writeResult = writeError ? { error: { message: writeError } } : { error: null };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi
      .fn()
      // first call: groups select (verifyAdmin)
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: groupFound ? { admin_user_id: adminUserId } : null,
              error: null,
            }),
          }),
        }),
      })
      // second call: upsert or delete on setter_overrides
      .mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue(writeResult),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(writeResult),
          }),
        }),
      }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
});

describe("updateSetterOverride", () => {
  it("returns success and revalidates on valid input", async () => {
    const result = await updateSetterOverride(GROUP_ID, WEEK, TARGET_USER);
    expect(result).toEqual({ success: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("returns an error when the group is not found", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ groupFound: false }) as never);
    const result = await updateSetterOverride(GROUP_ID, WEEK, TARGET_USER);
    expect(result).toEqual({ error: "Group not found" });
  });

  it("returns an error when the user is not the admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ adminUserId: "other-user" }) as never
    );
    const result = await updateSetterOverride(GROUP_ID, WEEK, TARGET_USER);
    expect(result).toEqual({ error: "Only the group admin can change the setter" });
  });

  it("returns the error message when the database upsert fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ writeError: "permission denied" }) as never
    );
    const result = await updateSetterOverride(GROUP_ID, WEEK, TARGET_USER);
    expect(result).toEqual({ error: "permission denied" });
  });

  it("does not revalidate when user is not the admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ adminUserId: "other-user" }) as never
    );
    await updateSetterOverride(GROUP_ID, WEEK, TARGET_USER);
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("does not revalidate when the database write fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ writeError: "db error" }) as never
    );
    await updateSetterOverride(GROUP_ID, WEEK, TARGET_USER);
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});

describe("clearSetterOverride", () => {
  it("returns success and revalidates", async () => {
    const result = await clearSetterOverride(GROUP_ID, WEEK);
    expect(result).toEqual({ success: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("returns an error when the group is not found", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ groupFound: false }) as never);
    const result = await clearSetterOverride(GROUP_ID, WEEK);
    expect(result).toEqual({ error: "Group not found" });
  });

  it("returns an error when the user is not the admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ adminUserId: "other-user" }) as never
    );
    const result = await clearSetterOverride(GROUP_ID, WEEK);
    expect(result).toEqual({ error: "Only the group admin can change the setter" });
  });

  it("returns the error message when the database delete fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ writeError: "permission denied" }) as never
    );
    const result = await clearSetterOverride(GROUP_ID, WEEK);
    expect(result).toEqual({ error: "permission denied" });
  });

  it("does not revalidate when user is not the admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ adminUserId: "other-user" }) as never
    );
    await clearSetterOverride(GROUP_ID, WEEK);
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});
