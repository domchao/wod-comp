import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "@/app/_components/Avatar";

describe("Avatar", () => {
  it("renders an image when src is provided", () => {
    render(<Avatar src="https://cdn.example.com/pic.jpg" name="Alice Smith" />);
    const img = screen.getByRole("img", { name: "Alice Smith" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://cdn.example.com/pic.jpg");
  });

  it("renders initials when no src is given", () => {
    render(<Avatar name="Alice Smith" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("renders a single initial for a one-word name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders only the first two initials for a long name", () => {
    render(<Avatar name="Alice Bob Charlie" />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("renders a fallback when name is empty", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders initials when src is null", () => {
    render(<Avatar src={null} name="Bob Jones" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("BJ")).toBeInTheDocument();
  });

  it("applies the sm size class by default", () => {
    render(<Avatar name="Alice" />);
    const el = screen.getByLabelText("Alice");
    expect(el.className).toContain("h-6");
    expect(el.className).toContain("w-6");
  });

  it("applies the lg size class when size is lg", () => {
    render(<Avatar name="Alice" size="lg" />);
    const el = screen.getByLabelText("Alice");
    expect(el.className).toContain("h-16");
    expect(el.className).toContain("w-16");
  });
});
