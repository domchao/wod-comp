import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderMenu } from "@/app/group/[id]/_components/HeaderMenu";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: React.MouseEventHandler;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

const GROUP_ID = "group-abc";

describe("HeaderMenu", () => {
  describe("initial state", () => {
    it("renders a burger button", () => {
      render(<HeaderMenu groupId={GROUP_ID} />);
      expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
    });

    it("hides the dropdown by default", () => {
      render(<HeaderMenu groupId={GROUP_ID} />);
      expect(screen.queryByRole("link", { name: /my stats/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /edit profile/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
    });
  });

  describe("opening", () => {
    it("shows the dropdown when the burger is clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderMenu groupId={GROUP_ID} />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /my stats/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("my stats link points to the correct route", async () => {
      const user = userEvent.setup();
      render(<HeaderMenu groupId={GROUP_ID} />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /my stats/i })).toHaveAttribute(
        "href",
        `/group/${GROUP_ID}/stats`
      );
    });

    it("edit profile link points to /profile", async () => {
      const user = userEvent.setup();
      render(<HeaderMenu groupId={GROUP_ID} />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /edit profile/i })).toHaveAttribute(
        "href",
        "/profile"
      );
    });
  });

  describe("closing", () => {
    it("closes when the burger is clicked again", async () => {
      const user = userEvent.setup();
      render(<HeaderMenu groupId={GROUP_ID} />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.queryByRole("link", { name: /my stats/i })).toBeNull();
    });

    it("closes when my stats is clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderMenu groupId={GROUP_ID} />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("link", { name: /my stats/i }));
      expect(screen.queryByRole("link", { name: /my stats/i })).toBeNull();
    });

    it("closes when edit profile is clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderMenu groupId={GROUP_ID} />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("link", { name: /edit profile/i }));
      expect(screen.queryByRole("link", { name: /edit profile/i })).toBeNull();
    });

    it("closes when clicking outside the menu", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <HeaderMenu groupId={GROUP_ID} />
          <button>outside</button>
        </div>
      );
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /my stats/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /outside/i }));
      expect(screen.queryByRole("link", { name: /my stats/i })).toBeNull();
    });
  });
});
