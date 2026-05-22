import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PositionChart,
  type ChartDataPoint,
} from "@/app/group/[id]/stats/_components/PositionChart";

const pt = (week: string, rank: number, total: number): ChartDataPoint => ({
  week,
  rank,
  total,
  workoutTitle: "Test Workout",
});

describe("PositionChart", () => {
  it("renders nothing for empty data", () => {
    const { container } = render(<PositionChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an SVG with an accessible label for non-empty data", () => {
    render(<PositionChart data={[pt("2026-01-06", 1, 3)]} />);
    expect(screen.getByRole("img", { name: /finishing position/i })).toBeInTheDocument();
  });

  it("renders one inner dot per data point", () => {
    const { container } = render(
      <PositionChart
        data={[pt("2026-01-06", 1, 3), pt("2026-01-13", 2, 3), pt("2026-01-20", 3, 3)]}
      />
    );
    expect(container.querySelectorAll('circle[r="4"]')).toHaveLength(3);
  });

  it("renders no line path for a single data point", () => {
    const { container } = render(<PositionChart data={[pt("2026-01-06", 1, 1)]} />);
    expect(container.querySelector("path")).toBeNull();
  });

  it("renders a line path when there are multiple data points", () => {
    const { container } = render(
      <PositionChart data={[pt("2026-01-06", 1, 3), pt("2026-01-13", 2, 3)]} />
    );
    expect(container.querySelector("path")).not.toBeNull();
  });

  it("renders a glow ring only on first-place dots", () => {
    const { container } = render(
      <PositionChart data={[pt("2026-01-06", 1, 3), pt("2026-01-13", 2, 3)]} />
    );
    // ring circles have r=7
    expect(container.querySelectorAll('circle[r="7"]')).toHaveLength(1);
  });

  it("applies amber fill to a first-place dot", () => {
    const { container } = render(<PositionChart data={[pt("2026-01-06", 1, 3)]} />);
    // RTL getByTitle only matches direct svg > title children; use container query for nested ones
    const titleEl = Array.from(container.querySelectorAll('circle[r="4"] title')).find(
      (t) => t.textContent?.trim() === "Jan 6: 1st of 3"
    );
    expect(titleEl).toBeDefined();
    expect(titleEl?.parentElement?.getAttribute("class")).toContain("amber");
  });

  it("formats ordinal tooltip titles correctly for 1st through 4th", () => {
    const { container } = render(
      <PositionChart
        data={[
          pt("2026-01-06", 1, 5),
          pt("2026-01-13", 2, 5),
          pt("2026-01-20", 3, 5),
          pt("2026-01-27", 4, 5),
        ]}
      />
    );
    const titles = Array.from(container.querySelectorAll('circle[r="4"] title')).map((t) =>
      t.textContent?.trim()
    );
    expect(titles).toContain("Jan 6: 1st of 5");
    expect(titles).toContain("Jan 13: 2nd of 5");
    expect(titles).toContain("Jan 20: 3rd of 5");
    expect(titles).toContain("Jan 27: 4th of 5");
  });
});
