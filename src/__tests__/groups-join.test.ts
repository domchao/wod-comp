import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { joinGroup } from "@/app/groups/actions";
import { sendPushToGroupMembers } from "@/lib/push";

vi.mock("@/lib/supabase/server");
vi.mock("next/navigation");
vi.mock("@/lib/push", () => ({ sendPushToGroupMembers: vi.fn().mockResolvedValue(undefined) }));

const USER_ID = "user-1";
const GROUP_ID = "group-42";

function buildSupabaseMock({
  rpcError = null as { message: string } | null,
  profileName = "Test User",
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: rpcError ? null : GROUP_ID,
      error: rpcError,
    }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: profileName } }),
        };
      }
      return {};
    }),
  };
}

function makeFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("invite_code", "ABC123");
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

describe("joinGroup", () => {
  it("redirects to the group page on success", async () => {
    await expect(joinGroup(null, makeFormData())).rejects.toThrow("redirect");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("sends a push to existing group members excluding the new member", async () => {
    await expect(joinGroup(null, makeFormData())).rejects.toThrow("redirect");

    expect(vi.mocked(sendPushToGroupMembers)).toHaveBeenCalledWith(
      GROUP_ID,
      expect.objectContaining({
        title: "New member",
        body: expect.stringContaining("Test User"),
        url: `/group/${GROUP_ID}`,
      }),
      USER_ID
    );
  });

  it("returns an error when the invite code is missing", async () => {
    const result = await joinGroup(null, makeFormData({ invite_code: "" }));
    expect(result).toEqual({ error: "Invite code is required" });
    expect(vi.mocked(sendPushToGroupMembers)).not.toHaveBeenCalled();
  });

  it("returns a friendly error for an invalid invite code", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ rpcError: { message: "Invalid invite code" } }) as never
    );
    const result = await joinGroup(null, makeFormData());
    expect(result).toEqual({ error: "Invalid invite code" });
    expect(vi.mocked(sendPushToGroupMembers)).not.toHaveBeenCalled();
  });

  it("returns the raw error message for other RPC failures", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ rpcError: { message: "already a member" } }) as never
    );
    const result = await joinGroup(null, makeFormData());
    expect(result).toEqual({ error: "already a member" });
    expect(vi.mocked(sendPushToGroupMembers)).not.toHaveBeenCalled();
  });
});
