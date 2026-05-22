import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoGroups } from "@/app/dashboard/_components/NoGroups";

vi.mock("@/app/groups/actions", () => ({
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
}));

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

describe("NoGroups", () => {
  it("renders the create group form", () => {
    render(<NoGroups />);
    expect(screen.getByText(/Create a group/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Monday crew/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create group" })).toBeInTheDocument();
  });

  it("renders the join group form", () => {
    render(<NoGroups />);
    expect(screen.getByText(/Join a group/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter invite code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join group" })).toBeInTheDocument();
  });

  it("renders the sign out button", () => {
    render(<NoGroups />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
