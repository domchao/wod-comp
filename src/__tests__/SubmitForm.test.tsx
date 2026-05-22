import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmitForm } from "@/app/group/[id]/submit/SubmitForm";

vi.mock("@/app/group/[id]/submit/actions", () => ({
  submitResult: vi.fn(),
}));

const GROUP_ID = "group-1";

const timeWorkout = { id: "w-1", title: "21-15-9", description: null, metric_type: "time" };
const repsWorkout = { id: "w-2", title: "Max pull-ups", description: null, metric_type: "reps" };
const weightWorkout = {
  id: "w-3",
  title: "1RM deadlift",
  description: null,
  metric_type: "weight",
};

describe("SubmitForm", () => {
  describe("time workout", () => {
    it("renders minutes and seconds inputs", () => {
      render(<SubmitForm groupId={GROUP_ID} workout={timeWorkout} existing={null} />);
      expect(screen.getByLabelText("Minutes")).toBeInTheDocument();
      expect(screen.getByLabelText("Seconds")).toBeInTheDocument();
    });

    it("does not render a single value input", () => {
      render(<SubmitForm groupId={GROUP_ID} workout={timeWorkout} existing={null} />);
      expect(screen.queryByLabelText(/reps|weight|rounds/i)).not.toBeInTheDocument();
    });

    it("pre-fills minutes and seconds from an existing submission", () => {
      // 150 seconds = 2 minutes + 30 seconds
      render(
        <SubmitForm
          groupId={GROUP_ID}
          workout={timeWorkout}
          existing={{ value: 150, notes: null, rx: false }}
        />
      );
      expect(screen.getByLabelText("Minutes")).toHaveValue(2);
      expect(screen.getByLabelText("Seconds")).toHaveValue(30);
    });

    it("pre-fills correctly when time is less than a minute", () => {
      // 45 seconds = 0 minutes + 45 seconds
      render(
        <SubmitForm
          groupId={GROUP_ID}
          workout={timeWorkout}
          existing={{ value: 45, notes: null, rx: false }}
        />
      );
      expect(screen.getByLabelText("Minutes")).toHaveValue(0);
      expect(screen.getByLabelText("Seconds")).toHaveValue(45);
    });
  });

  describe("non-time workout", () => {
    it("renders a single value input for reps", () => {
      render(<SubmitForm groupId={GROUP_ID} workout={repsWorkout} existing={null} />);
      expect(screen.getByLabelText("Reps completed")).toBeInTheDocument();
      expect(screen.queryByLabelText("Minutes")).not.toBeInTheDocument();
    });

    it("renders a single value input for weight", () => {
      render(<SubmitForm groupId={GROUP_ID} workout={weightWorkout} existing={null} />);
      expect(screen.getByLabelText("Weight lifted")).toBeInTheDocument();
    });

    it("pre-fills the value input from an existing submission", () => {
      render(
        <SubmitForm
          groupId={GROUP_ID}
          workout={repsWorkout}
          existing={{ value: 42, notes: null, rx: false }}
        />
      );
      expect(screen.getByLabelText("Reps completed")).toHaveValue(42);
    });
  });

  describe("button text", () => {
    it("shows 'Submit result' when there is no existing submission", () => {
      render(<SubmitForm groupId={GROUP_ID} workout={repsWorkout} existing={null} />);
      expect(screen.getByRole("button", { name: "Submit result" })).toBeInTheDocument();
    });

    it("shows 'Update result' when there is an existing submission", () => {
      render(
        <SubmitForm
          groupId={GROUP_ID}
          workout={repsWorkout}
          existing={{ value: 42, notes: null, rx: false }}
        />
      );
      expect(screen.getByRole("button", { name: "Update result" })).toBeInTheDocument();
    });
  });

  describe("notes field", () => {
    it("pre-fills notes from an existing submission", () => {
      render(
        <SubmitForm
          groupId={GROUP_ID}
          workout={repsWorkout}
          existing={{ value: 42, notes: "scaled", rx: false }}
        />
      );
      expect(screen.getByLabelText(/Notes/)).toHaveValue("scaled");
    });
  });
});
