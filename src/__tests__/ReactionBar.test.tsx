import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactionBar } from "@/app/group/[id]/_components/ReactionBar";

vi.mock("@/app/group/[id]/reactions/actions", () => ({
  toggleReaction: vi.fn().mockResolvedValue(undefined),
}));

import { toggleReaction } from "@/app/group/[id]/reactions/actions";

const CURRENT_USER = "user-me";
const OTHER_USER = "user-other";
const SUBMISSION_ID = "sub-1";
const GROUP_ID = "group-1";

const noReactions: { user_id: string; emoji: string }[] = [];

describe("ReactionBar", () => {
  describe("rendering", () => {
    it("renders all four emoji buttons", () => {
      render(
        <ReactionBar
          submissionId={SUBMISSION_ID}
          groupId={GROUP_ID}
          currentUserId={CURRENT_USER}
          reactions={noReactions}
        />
      );
      expect(screen.getByRole("button", { name: /🔥/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /💪/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /👏/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /😂/ })).toBeInTheDocument();
    });

    it("shows no counts when there are no reactions", () => {
      render(
        <ReactionBar
          submissionId={SUBMISSION_ID}
          groupId={GROUP_ID}
          currentUserId={CURRENT_USER}
          reactions={noReactions}
        />
      );
      // buttons should just show the emoji with no number
      expect(screen.getByRole("button", { name: "🔥" })).toBeInTheDocument();
    });

    it("shows a count when others have reacted", () => {
      const reactions = [
        { user_id: OTHER_USER, emoji: "🔥" },
        { user_id: "user-third", emoji: "🔥" },
      ];
      render(
        <ReactionBar
          submissionId={SUBMISSION_ID}
          groupId={GROUP_ID}
          currentUserId={CURRENT_USER}
          reactions={reactions}
        />
      );
      expect(screen.getByRole("button", { name: "🔥2" })).toBeInTheDocument();
    });

    it("applies the active style when the current user has reacted", () => {
      const reactions = [{ user_id: CURRENT_USER, emoji: "💪" }];
      render(
        <ReactionBar
          submissionId={SUBMISSION_ID}
          groupId={GROUP_ID}
          currentUserId={CURRENT_USER}
          reactions={reactions}
        />
      );
      const activeButton = screen.getByRole("button", { name: "💪1" });
      expect(activeButton.className).toContain("bg-zinc-900");
    });

    it("applies the inactive style when the current user has not reacted", () => {
      render(
        <ReactionBar
          submissionId={SUBMISSION_ID}
          groupId={GROUP_ID}
          currentUserId={CURRENT_USER}
          reactions={noReactions}
        />
      );
      const inactiveButton = screen.getByRole("button", { name: "🔥" });
      expect(inactiveButton.className).toContain("bg-zinc-100");
    });
  });

  describe("interaction", () => {
    it("calls toggleReaction with the correct args when a button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ReactionBar
          submissionId={SUBMISSION_ID}
          groupId={GROUP_ID}
          currentUserId={CURRENT_USER}
          reactions={noReactions}
        />
      );

      await user.click(screen.getByRole("button", { name: "🔥" }));

      expect(vi.mocked(toggleReaction)).toHaveBeenCalledWith(GROUP_ID, SUBMISSION_ID, "🔥");
    });
  });
});
