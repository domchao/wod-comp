import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditWorkoutForm } from "@/app/group/[id]/workout/[workoutId]/edit/EditWorkoutForm";

vi.mock("@/app/group/[id]/workout/actions", () => ({
  updateWorkout: vi.fn(),
}));

const GROUP_ID = "group-1";
const WORKOUT = {
  id: "w-1",
  title: "Cindy",
  description: "20 min AMRAP: 5 pull-ups, 10 push-ups, 15 squats",
  metric_type: "rounds",
  photo_url: null,
};
const WORKOUT_WITH_PHOTO = { ...WORKOUT, photo_url: "https://cdn.example.com/existing.jpg" };

const EXTRACTED = {
  title: "Fran",
  description: "21-15-9 Thrusters and Pull-ups",
  metric_type: "time",
};

class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readAsDataURL(_blob: Blob) {
    this.result = "data:image/jpeg;base64,FAKEBASE64";
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-preview");
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal("FileReader", FakeFileReader);
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(EXTRACTED),
  }) as typeof global.fetch;
});

describe("EditWorkoutForm — AI extraction", () => {
  it("does not show the extract button when no new file is selected", () => {
    render(<EditWorkoutForm groupId={GROUP_ID} workout={WORKOUT} />);
    expect(screen.queryByRole("button", { name: /extract workout details with ai/i })).toBeNull();
  });

  it("does not show the extract button when only an existing photo is present", () => {
    render(<EditWorkoutForm groupId={GROUP_ID} workout={WORKOUT_WITH_PHOTO} />);
    expect(screen.queryByRole("button", { name: /extract workout details with ai/i })).toBeNull();
  });

  it("shows the extract button after selecting a new file", async () => {
    const user = userEvent.setup();
    render(<EditWorkoutForm groupId={GROUP_ID} workout={WORKOUT} />);

    await user.upload(
      screen.getByLabelText(/^photo/i),
      new File(["img"], "new.jpg", { type: "image/jpeg" })
    );

    expect(
      screen.getByRole("button", { name: /extract workout details with ai/i })
    ).toBeInTheDocument();
  });

  it("overwrites title, description and metric_type with extracted values", async () => {
    const user = userEvent.setup();
    render(<EditWorkoutForm groupId={GROUP_ID} workout={WORKOUT} />);

    await user.upload(
      screen.getByLabelText(/^photo/i),
      new File(["img"], "new.jpg", { type: "image/jpeg" })
    );
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Fran")).toBeInTheDocument());
    expect(screen.getByDisplayValue("21-15-9 Thrusters and Pull-ups")).toBeInTheDocument();

    const timeRadio = screen
      .getAllByRole("radio")
      .find((el) => (el as HTMLInputElement).value === "time");
    expect(timeRadio).toBeChecked();
  });

  it("preserves existing fields that the AI omits", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ title: "Murph" }),
    }) as typeof global.fetch;

    const user = userEvent.setup();
    render(<EditWorkoutForm groupId={GROUP_ID} workout={WORKOUT} />);

    await user.upload(
      screen.getByLabelText(/^photo/i),
      new File(["img"], "new.jpg", { type: "image/jpeg" })
    );
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Murph")).toBeInTheDocument());
    // description not overwritten since AI didn't return one
    expect(
      screen.getByDisplayValue("20 min AMRAP: 5 pull-ups, 10 push-ups, 15 squats")
    ).toBeInTheDocument();
  });

  it("shows an error when the API returns an error field", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: "Failed to parse AI response" }),
    }) as typeof global.fetch;

    const user = userEvent.setup();
    render(<EditWorkoutForm groupId={GROUP_ID} workout={WORKOUT} />);

    await user.upload(
      screen.getByLabelText(/^photo/i),
      new File(["img"], "new.jpg", { type: "image/jpeg" })
    );
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() =>
      expect(screen.getByText("Failed to parse AI response")).toBeInTheDocument()
    );
  });
});
