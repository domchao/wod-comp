import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: prefersDark,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark", "light");
});

describe("ThemeToggle", () => {
  describe("initial label from localStorage", () => {
    it("shows 'Light' when stored theme is dark", () => {
      mockMatchMedia(false);
      localStorage.setItem("theme", "dark");
      render(<ThemeToggle />);
      expect(screen.getByRole("button", { name: /switch to light/i })).toHaveTextContent("Light");
    });

    it("shows 'Dark' when stored theme is light", () => {
      mockMatchMedia(false);
      localStorage.setItem("theme", "light");
      render(<ThemeToggle />);
      expect(screen.getByRole("button", { name: /switch to dark/i })).toHaveTextContent("Dark");
    });
  });

  describe("initial label from system preference (no localStorage)", () => {
    it("shows 'Light' when system prefers dark", () => {
      mockMatchMedia(true);
      render(<ThemeToggle />);
      expect(screen.getByRole("button", { name: /switch to light/i })).toHaveTextContent("Light");
    });

    it("shows 'Dark' when system prefers light", () => {
      mockMatchMedia(false);
      render(<ThemeToggle />);
      expect(screen.getByRole("button", { name: /switch to dark/i })).toHaveTextContent("Dark");
    });
  });

  describe("toggle", () => {
    it("switches light → dark: updates localStorage, adds dark class, shows 'Light'", async () => {
      mockMatchMedia(false);
      localStorage.setItem("theme", "light");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole("button"));

      expect(localStorage.getItem("theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(screen.getByRole("button")).toHaveTextContent("Light");
    });

    it("switches dark → light: updates localStorage, removes dark class, shows 'Dark'", async () => {
      mockMatchMedia(false);
      localStorage.setItem("theme", "dark");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole("button"));

      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(screen.getByRole("button")).toHaveTextContent("Dark");
    });
  });
});
