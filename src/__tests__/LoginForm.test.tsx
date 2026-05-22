import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/app/_components/LoginForm";

vi.mock("@/app/auth/actions", () => ({
  authWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

describe("LoginForm", () => {
  it("renders email and password inputs", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders the Continue with Google button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it("includes a hidden next field in both forms when next prop is provided", () => {
    render(<LoginForm next="/invite/abc123" />);
    const hiddenInputs = document.querySelectorAll<HTMLInputElement>(
      "input[type='hidden'][name='next']"
    );
    expect(hiddenInputs).toHaveLength(2);
    hiddenInputs.forEach((input) => expect(input.value).toBe("/invite/abc123"));
  });

  it("does not render a next field when next prop is omitted", () => {
    render(<LoginForm />);
    expect(document.querySelector("input[name='next']")).toBeNull();
  });

  describe("sign in mode (default)", () => {
    it("shows a Sign in submit button", () => {
      render(<LoginForm />);
      expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });

    it("shows the sign up toggle", () => {
      render(<LoginForm />);
      expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    });
  });

  describe("sign up mode (after toggle)", () => {
    it("switches to sign up mode when the toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole("button", { name: "Sign up" }));

      expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
      expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
    });

    it("switches back to sign in mode when the toggle is clicked again", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole("button", { name: "Sign up" }));
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
    });
  });
});
