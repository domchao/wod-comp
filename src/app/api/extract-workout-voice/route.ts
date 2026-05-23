import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type ExtractedWorkout = {
  title: string;
  description: string;
  metric_type: "time" | "reps" | "weight" | "rounds";
};

export async function POST(request: Request) {
  const { base64, mimeType } = await request.json();
  if (!base64 || !mimeType) {
    return NextResponse.json({ error: "Missing audio data" }, { status: 400 });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      {
        inlineData: { mimeType, data: base64 },
      },
      {
        text: `Listen to this voice recording and extract the fitness/CrossFit workout being described.
Respond with a JSON object (no markdown, no code fences) containing exactly these fields:
- "title": a concise workout name or identifier (string)
- "description": the full workout — movements, reps, weights, time domains, and any scaling notes (string)
- "metric_type": how the result is scored — must be exactly one of: "time" (fastest time wins), "reps" (max reps wins), "weight" (max weight wins), "rounds" (AMRAP, most rounds+reps wins)

If any field cannot be determined from the audio, omit it.`,
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  try {
    const data = JSON.parse(response.text ?? "{}") as Partial<ExtractedWorkout>;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
