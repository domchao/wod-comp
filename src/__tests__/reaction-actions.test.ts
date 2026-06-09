import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toggleReaction } from "@/app/group/[id]/reactions/actions";
import { sendPushToUsers } from "@/lib/push";

vi.mock("@/lib/supabase/server");
vi.mock("next/cache");
vi.mock("next/navigation");
vi.mock("@/lib/push", () => ({ sendPushToUsers: vi.fn().mockResolvedValue(undefined) }));

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const GROUP_ID = "group-1";
const SUBMISSION_ID = "sub-1";
const EMOJI = "🔥";

function buildSupabaseMock({
  existingReaction = null as { user_id: string } | null,
  submissionOwnerId = OTHER_USER_ID,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "reactions") {
        const deleteChain = {
          eq: vi.fn().mockReturnThis(),
        };
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existingReaction }),
          delete: vi.fn().mockReturnValue(deleteChain),
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      if (table === "submissions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { user_id: submissionOwnerId } }),
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error("redirect");
  });
});

describe("toggleReaction", () => {
  it("revalidates the group path after adding a reaction", async () => {
    await toggleReaction(GROUP_ID, SUBMISSION_ID, EMOJI);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("revalidates the group path after removing a reaction", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ existingReaction: { user_id: USER_ID } }) as never
    );
    await toggleReaction(GROUP_ID, SUBMISSION_ID, EMOJI);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/group/${GROUP_ID}`);
  });

  it("sends a push to the submission owner when adding a reaction", async () => {
    await toggleReaction(GROUP_ID, SUBMISSION_ID, EMOJI);

    expect(vi.mocked(sendPushToUsers)).toHaveBeenCalledWith(
      [OTHER_USER_ID],
      expect.objectContaining({
        title: "New reaction",
        body: expect.stringContaining(EMOJI),
        url: `/group/${GROUP_ID}`,
      })
    );
  });

  it("includes the reactor's name in the push body", async () => {
    await toggleReaction(GROUP_ID, SUBMISSION_ID, EMOJI);

    expect(vi.mocked(sendPushToUsers)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: expect.stringContaining("Test User") })
    );
  });

  it("does not send a push when removing a reaction", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ existingReaction: { user_id: USER_ID } }) as never
    );
    await toggleReaction(GROUP_ID, SUBMISSION_ID, EMOJI);
    expect(vi.mocked(sendPushToUsers)).not.toHaveBeenCalled();
  });

  it("does not send a push when reacting to your own submission", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ submissionOwnerId: USER_ID }) as never
    );
    await toggleReaction(GROUP_ID, SUBMISSION_ID, EMOJI);
    expect(vi.mocked(sendPushToUsers)).not.toHaveBeenCalled();
  });
});
