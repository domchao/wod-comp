import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekNav } from "@/app/group/[id]/_components/WeekNav";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const GROUP_ID = "group-abc";

describe("WeekNav", () => {
  describe("label", () => {
    it("shows 'This week' when on the current week", () => {
      render(
        <WeekNav
          groupId={GROUP_ID}
          weekStr="2026-05-18"
          prevWeek="2026-05-11"
          nextWeek={null}
          isCurrentWeek={true}
        />
      );
      expect(screen.getByRole("heading", { name: /this week/i })).toBeInTheDocument();
    });

    it("shows 'Week of [date]' when viewing a past week", () => {
      render(
        <WeekNav
          groupId={GROUP_ID}
          weekStr="2026-05-11"
          prevWeek={null}
          nextWeek="2026-05-18"
          isCurrentWeek={false}
        />
      );
      // en-GB locale formats as "11 May 2026"
      expect(screen.getByRole("heading", { name: /week of 11 may 2026/i })).toBeInTheDocument();
    });
  });

  describe("left (previous) arrow", () => {
    it("is a link to the previous week when prevWeek is set", () => {
      render(
        <WeekNav
          groupId={GROUP_ID}
          weekStr="2026-05-18"
          prevWeek="2026-05-11"
          nextWeek={null}
          isCurrentWeek={true}
        />
      );
      const link = screen.getByRole("link", { name: /previous week/i });
      expect(link).toHaveAttribute("href", `/group/${GROUP_ID}?week=2026-05-11`);
    });

    it("is not a link when prevWeek is null", () => {
      render(
        <WeekNav
          groupId={GROUP_ID}
          weekStr="2026-05-11"
          prevWeek={null}
          nextWeek="2026-05-18"
          isCurrentWeek={false}
        />
      );
      expect(screen.queryByRole("link", { name: /previous week/i })).toBeNull();
    });
  });

  describe("right (next) arrow", () => {
    it("is a link to the next week when nextWeek is set", () => {
      render(
        <WeekNav
          groupId={GROUP_ID}
          weekStr="2026-05-11"
          prevWeek={null}
          nextWeek="2026-05-18"
          isCurrentWeek={false}
        />
      );
      const link = screen.getByRole("link", { name: /next week/i });
      expect(link).toHaveAttribute("href", `/group/${GROUP_ID}?week=2026-05-18`);
    });

    it("is not a link when nextWeek is null", () => {
      render(
        <WeekNav
          groupId={GROUP_ID}
          weekStr="2026-05-18"
          prevWeek="2026-05-11"
          nextWeek={null}
          isCurrentWeek={true}
        />
      );
      expect(screen.queryByRole("link", { name: /next week/i })).toBeNull();
    });
  });

  it("renders no links at all when both prev and next are null", () => {
    render(
      <WeekNav
        groupId={GROUP_ID}
        weekStr="2026-05-11"
        prevWeek={null}
        nextWeek={null}
        isCurrentWeek={false}
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
