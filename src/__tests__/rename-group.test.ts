import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { renameGroup } from "@/app/groups/actions";

vi.mock("@/lib/supabase/server");
vi.mock("next/cache");

const USER_ID = "user-1";
const GROUP_ID = "group-1";

function buildSupabaseMock({
  adminUserId = USER_ID,
  groupFound = true,
  updateError = null as string | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi
      .fn()
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
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: updateError
            ? vi.fn().mockResolvedValue({ error: { message: updateError } })
            : vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
  };
}

function makeFormData(name: string, groupId = GROUP_ID) {
  const fd = new FormData();
  fd.set("name", name);
  fd.set("group_id", groupId);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
});

describe("renameGroup", () => {
  it("returns success and revalidates on a valid name", async () => {
    const result = await renameGroup(null, makeFormData("New Name"));
    expect(result).toEqual({ success: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
  });

  it("returns an error when the name is empty", async () => {
    const result = await renameGroup(null, makeFormData(""));
    expect(result).toEqual({ error: "Group name is required" });
  });

  it("returns an error when the name is only whitespace", async () => {
    const result = await renameGroup(null, makeFormData("   "));
    expect(result).toEqual({ error: "Group name is required" });
  });

  it("returns an error when the group is not found", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock({ groupFound: false }) as never);
    const result = await renameGroup(null, makeFormData("New Name"));
    expect(result).toEqual({ error: "Group not found" });
  });

  it("returns an error when the user is not the admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ adminUserId: "other-user" }) as never
    );
    const result = await renameGroup(null, makeFormData("New Name"));
    expect(result).toEqual({ error: "Only the group admin can rename the group" });
  });

  it("returns the error message when the database update fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ updateError: "permission denied" }) as never
    );
    const result = await renameGroup(null, makeFormData("New Name"));
    expect(result).toEqual({ error: "permission denied" });
  });

  it("does not revalidate when validation fails", async () => {
    await renameGroup(null, makeFormData(""));
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("does not revalidate when user is not the admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ adminUserId: "other-user" }) as never
    );
    await renameGroup(null, makeFormData("New Name"));
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});
