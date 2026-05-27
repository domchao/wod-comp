import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetterPicker } from "@/app/group/[id]/_components/SetterPicker";

vi.mock("@/app/group/[id]/setter/actions", () => ({
  updateSetterOverride: vi.fn().mockResolvedValue({ success: true }),
  clearSetterOverride: vi.fn().mockResolvedValue({ success: true }),
}));

import { updateSetterOverride, clearSetterOverride } from "@/app/group/[id]/setter/actions";

const GROUP_ID = "group-1";
const WEEK = "2026-05-25";

const members = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
  { id: "charlie", name: "Charlie" },
];

function renderPicker(overrides: Partial<Parameters<typeof SetterPicker>[0]> = {}) {
  return render(
    <SetterPicker
      groupId={GROUP_ID}
      weekStart={WEEK}
      setterId="alice"
      isOverridden={false}
      isMyTurn={false}
      members={members}
      {...overrides}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateSetterOverride).mockResolvedValue({ success: true });
  vi.mocked(clearSetterOverride).mockResolvedValue({ success: true });
});

describe("SetterPicker", () => {
  describe("setter text", () => {
    it("shows the current setter's name when it's not the admin's turn", () => {
      renderPicker({ setterId: "bob", isMyTurn: false });
      expect(screen.getByText(/bob's turn to set the workout/i)).toBeInTheDocument();
    });

    it("shows 'your turn' when isMyTurn is true", () => {
      renderPicker({ isMyTurn: true });
      expect(screen.getByText(/your turn to set the workout/i)).toBeInTheDocument();
    });
  });

  describe("Change button", () => {
    it("renders a Change button", () => {
      renderPicker();
      expect(screen.getByRole("button", { name: /change/i })).toBeInTheDocument();
    });

    it("shows the member dropdown when Change is clicked", async () => {
      const user = userEvent.setup();
      renderPicker();
      await user.click(screen.getByRole("button", { name: /change/i }));
      expect(screen.getByRole("button", { name: /alice/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /bob/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /charlie/i })).toBeInTheDocument();
    });

    it("hides the dropdown when Change is clicked again", async () => {
      const user = userEvent.setup();
      renderPicker();
      await user.click(screen.getByRole("button", { name: /change/i }));
      await user.click(screen.getByRole("button", { name: /change/i }));
      expect(screen.queryByRole("button", { name: /alice/i })).toBeNull();
    });

    it("marks the current setter with a checkmark in the dropdown", async () => {
      const user = userEvent.setup();
      renderPicker({ setterId: "bob" });
      await user.click(screen.getByRole("button", { name: /change/i }));
      const bobButton = screen.getByRole("button", { name: /bob/i });
      expect(bobButton).toHaveTextContent("✓");
    });
  });

  describe("picking a member", () => {
    it("calls updateSetterOverride with the selected member", async () => {
      const user = userEvent.setup();
      renderPicker({ setterId: "alice" });
      await user.click(screen.getByRole("button", { name: /change/i }));
      await user.click(screen.getByRole("button", { name: /bob/i }));
      await waitFor(() =>
        expect(vi.mocked(updateSetterOverride)).toHaveBeenCalledWith(GROUP_ID, WEEK, "bob")
      );
    });

    it("closes the dropdown after picking", async () => {
      const user = userEvent.setup();
      renderPicker();
      await user.click(screen.getByRole("button", { name: /change/i }));
      await user.click(screen.getByRole("button", { name: /bob/i }));
      expect(screen.queryByRole("button", { name: /charlie/i })).toBeNull();
    });

    it("shows an error message when updateSetterOverride fails", async () => {
      vi.mocked(updateSetterOverride).mockResolvedValue({ error: "permission denied" });
      const user = userEvent.setup();
      renderPicker();
      await user.click(screen.getByRole("button", { name: /change/i }));
      await user.click(screen.getByRole("button", { name: /bob/i }));
      await waitFor(() => expect(screen.getByText(/permission denied/i)).toBeInTheDocument());
    });
  });

  describe("manual override badge", () => {
    it("does not show the manual badge when not overridden", () => {
      renderPicker({ isOverridden: false });
      expect(screen.queryByRole("button", { name: /manual/i })).toBeNull();
    });

    it("shows the manual badge when isOverridden is true", () => {
      renderPicker({ isOverridden: true });
      expect(screen.getByRole("button", { name: /manual/i })).toBeInTheDocument();
    });

    it("calls clearSetterOverride when the manual badge is clicked", async () => {
      const user = userEvent.setup();
      renderPicker({ isOverridden: true });
      await user.click(screen.getByRole("button", { name: /manual/i }));
      await waitFor(() =>
        expect(vi.mocked(clearSetterOverride)).toHaveBeenCalledWith(GROUP_ID, WEEK)
      );
    });

    it("shows an error message when clearSetterOverride fails", async () => {
      vi.mocked(clearSetterOverride).mockResolvedValue({ error: "not admin" });
      const user = userEvent.setup();
      renderPicker({ isOverridden: true });
      await user.click(screen.getByRole("button", { name: /manual/i }));
      await waitFor(() => expect(screen.getByText(/not admin/i)).toBeInTheDocument());
    });
  });
});
