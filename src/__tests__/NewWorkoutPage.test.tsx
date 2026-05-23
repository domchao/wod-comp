import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewWorkoutPage from "@/app/group/[id]/workout/new/page";

vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({ id: "group-1" }),
}));

vi.mock("@/app/group/[id]/workout/actions", () => ({
  createWorkout: vi.fn(),
}));

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

type MediaRecorderEventMap = { dataavailable: { data: Blob }; stop: undefined };

class FakeMediaRecorder {
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    queueMicrotask(() =>
      this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) })
    );
  }
  stop() {
    queueMicrotask(() => this.onstop?.());
  }
  // satisfy TS without a full impl
  addEventListener<K extends keyof MediaRecorderEventMap>(_: K, __: unknown) {}
  removeEventListener<K extends keyof MediaRecorderEventMap>(_: K, __: unknown) {}
}

const mockGetUserMedia = vi.fn();

function setupMediaMocks() {
  const mockTrack = { stop: vi.fn() };
  const mockStream = { getTracks: vi.fn().mockReturnValue([mockTrack]) };
  mockGetUserMedia.mockReset();
  mockGetUserMedia.mockResolvedValue(mockStream);
  Object.defineProperty(global.navigator, "mediaDevices", {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
}

beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-preview");
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal("FileReader", FakeFileReader);
  setupMediaMocks();
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(EXTRACTED),
  }) as typeof global.fetch;
});

async function renderAndUpload() {
  const user = userEvent.setup();
  render(<NewWorkoutPage />);
  const file = new File(["img"], "wod.jpg", { type: "image/jpeg" });
  await user.upload(screen.getByLabelText(/^photo/i), file);
  return user;
}

describe("NewWorkoutPage — AI extraction", () => {
  it("does not show the extract button before a photo is selected", () => {
    render(<NewWorkoutPage />);
    expect(screen.queryByRole("button", { name: /extract workout details with ai/i })).toBeNull();
  });

  it("shows the extract button after a photo is selected", async () => {
    await renderAndUpload();
    expect(
      screen.getByRole("button", { name: /extract workout details with ai/i })
    ).toBeInTheDocument();
  });

  it("calls /api/extract-workout when the button is clicked", async () => {
    const user = await renderAndUpload();
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/extract-workout",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("populates title, description and metric_type from the API response", async () => {
    const user = await renderAndUpload();
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Fran")).toBeInTheDocument());
    expect(screen.getByDisplayValue("21-15-9 Thrusters and Pull-ups")).toBeInTheDocument();

    const timeRadio = screen
      .getAllByRole("radio")
      .find((el) => (el as HTMLInputElement).value === "time");
    expect(timeRadio).toBeChecked();
  });

  it("shows an error when the API returns an error field", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: "Failed to parse AI response" }),
    }) as typeof global.fetch;

    const user = await renderAndUpload();
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() =>
      expect(screen.getByText("Failed to parse AI response")).toBeInTheDocument()
    );
  });

  it("shows an error when the fetch call throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const user = await renderAndUpload();
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() =>
      expect(screen.getByText("Could not reach the AI service")).toBeInTheDocument()
    );
  });
});

describe("NewWorkoutPage — voice recording", () => {
  it("shows a Record button on initial render", () => {
    render(<NewWorkoutPage />);
    expect(screen.getByRole("button", { name: /^record$/i })).toBeInTheDocument();
  });

  it("does not show the voice extract button before recording", () => {
    render(<NewWorkoutPage />);
    // There should be no extract button at all before any recording exists
    expect(screen.queryByRole("button", { name: /extract workout details with ai/i })).toBeNull();
  });

  it("switches to Stop button while recording", async () => {
    const user = userEvent.setup();
    render(<NewWorkoutPage />);
    await user.click(screen.getByRole("button", { name: /^record$/i }));
    expect(screen.getByRole("button", { name: /^stop$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^record$/i })).toBeNull();
  });

  it("shows audio player and extract button after stopping", async () => {
    const user = userEvent.setup();
    const { container } = render(<NewWorkoutPage />);
    await user.click(screen.getByRole("button", { name: /^record$/i }));
    await user.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() => expect(container.querySelector("audio")).not.toBeNull());
    expect(
      screen.getByRole("button", { name: /extract workout details with ai/i })
    ).toBeInTheDocument();
  });

  it("calls /api/extract-workout-voice when the extract button is clicked", async () => {
    const user = userEvent.setup();
    render(<NewWorkoutPage />);
    await user.click(screen.getByRole("button", { name: /^record$/i }));
    await user.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /extract workout details with ai/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/extract-workout-voice",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("populates title, description and metric_type from the voice API response", async () => {
    const user = userEvent.setup();
    render(<NewWorkoutPage />);
    await user.click(screen.getByRole("button", { name: /^record$/i }));
    await user.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /extract workout details with ai/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() => expect(screen.getByDisplayValue("Fran")).toBeInTheDocument());
    expect(screen.getByDisplayValue("21-15-9 Thrusters and Pull-ups")).toBeInTheDocument();
    const timeRadio = screen
      .getAllByRole("radio")
      .find((el) => (el as HTMLInputElement).value === "time");
    expect(timeRadio).toBeChecked();
  });

  it("shows an error when microphone access is denied", async () => {
    mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

    const user = userEvent.setup();
    render(<NewWorkoutPage />);
    await user.click(screen.getByRole("button", { name: /^record$/i }));

    await waitFor(() => expect(screen.getByText("Microphone access denied")).toBeInTheDocument());
  });

  it("shows an error when the voice extract API returns an error field", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: "Failed to parse AI response" }),
    }) as typeof global.fetch;

    const user = userEvent.setup();
    render(<NewWorkoutPage />);
    await user.click(screen.getByRole("button", { name: /^record$/i }));
    await user.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /extract workout details with ai/i })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /extract workout details with ai/i }));

    await waitFor(() =>
      expect(screen.getByText("Failed to parse AI response")).toBeInTheDocument()
    );
  });
});
