import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardMenu } from "@/app/dashboard/_components/DashboardMenu";

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

describe("DashboardMenu", () => {
  describe("initial state", () => {
    it("renders a burger button", () => {
      render(<DashboardMenu />);
      expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
    });

    it("hides the dropdown by default", () => {
      render(<DashboardMenu />);
      expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
    });
  });

  describe("opening", () => {
    it("shows the dropdown when the burger is clicked", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("settings link points to /settings", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
    });
  });

  describe("closing", () => {
    it("closes when the burger is clicked again", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
    });

    it("closes when settings is clicked", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu />);
      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("link", { name: /settings/i }));
      expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
    });

    it("closes when clicking outside the menu", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <DashboardMenu />
          <button>outside</button>
        </div>
      );
      await user.click(screen.getByRole("button", { name: /menu/i }));
      expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /outside/i }));
      expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
    });
  });
});
