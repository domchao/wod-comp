import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteSection } from "@/app/group/[id]/_components/InviteSection";

describe("InviteSection", () => {
  it("displays the invite code in uppercase", () => {
    render(<InviteSection inviteCode="abc123ef" siteUrl="https://example.com" />);
    expect(screen.getByText("ABC123EF")).toBeInTheDocument();
  });

  it("shows 'Copied!' feedback after clicking the copy button", async () => {
    const user = userEvent.setup();
    render(<InviteSection inviteCode="abc123ef" siteUrl="https://example.com" />);

    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });
});
