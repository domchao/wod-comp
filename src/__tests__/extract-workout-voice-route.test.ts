import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: mockGenerateContent } };
  }),
}));

import { POST } from "@/app/api/extract-workout-voice/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/extract-workout-voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/extract-workout-voice", () => {
  it("returns 400 when base64 is missing", async () => {
    const res = await POST(makeRequest({ mimeType: "audio/webm" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing audio data" });
  });

  it("returns 400 when mimeType is missing", async () => {
    const res = await POST(makeRequest({ base64: "AAAA" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing audio data" });
  });

  it("returns extracted workout fields from a successful Gemini response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Fran",
        description: "21-15-9 Thrusters and Pull-ups",
        metric_type: "time",
      }),
    });

    const res = await POST(makeRequest({ base64: "AAAA", mimeType: "audio/webm" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      title: "Fran",
      description: "21-15-9 Thrusters and Pull-ups",
      metric_type: "time",
    });
  });

  it("returns only present fields when Gemini omits some", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ title: "Cindy" }),
    });

    const res = await POST(makeRequest({ base64: "AAAA", mimeType: "audio/webm" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "Cindy" });
  });

  it("returns 500 when Gemini response is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json at all" });

    const res = await POST(makeRequest({ base64: "AAAA", mimeType: "audio/webm" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to parse AI response" });
  });

  it("passes the audio inline data to Gemini", async () => {
    mockGenerateContent.mockResolvedValue({ text: "{}" });

    await POST(makeRequest({ base64: "AUDIODATA", mimeType: "audio/webm" }));

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.arrayContaining([
          { inlineData: { mimeType: "audio/webm", data: "AUDIODATA" } },
        ]),
      })
    );
  });
});
