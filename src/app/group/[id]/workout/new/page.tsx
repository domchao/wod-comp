"use client";

import { useActionState, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createWorkout } from "../actions";

type State = { error: string } | null;

const METRIC_OPTIONS = [
  { value: "time", label: "For time", hint: "lower is better" },
  { value: "reps", label: "Max reps", hint: "higher is better" },
  { value: "weight", label: "Max weight", hint: "higher is better" },
  { value: "rounds", label: "AMRAP", hint: "rounds + reps" },
];

export default function NewWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const [state, action, pending] = useActionState<State, FormData>(createWorkout, null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricType, setMetricType] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceExtracting, setVoiceExtracting] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
    setExtractError(null);
  }

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/extract-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (data.error) {
        setExtractError(data.error);
      } else {
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.metric_type) setMetricType(data.metric_type);
      }
    } catch {
      setExtractError("Could not reach the AI service");
    } finally {
      setExtracting(false);
    }
  }

  async function startRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mr.start();
      setRecording(true);
    } catch {
      setVoiceError("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleVoiceExtract() {
    if (!audioBlob) return;
    setVoiceExtracting(true);
    setVoiceError(null);
    try {
      const base64 = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || "audio/webm";
      const res = await fetch("/api/extract-workout-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType }),
      });
      const data = await res.json();
      if (data.error) {
        setVoiceError(data.error);
      } else {
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.metric_type) setMetricType(data.metric_type);
      }
    } catch {
      setVoiceError("Could not reach the AI service");
    } finally {
      setVoiceExtracting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 space-y-6">
      <h1 className="text-2xl font-bold">Post this week&apos;s workout</h1>

      <form action={action} className="space-y-5">
        <input type="hidden" name="group_id" value={id} />

        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 21-15-9 Thrusters and Pull-ups"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="photo" className="text-sm font-medium">
            Photo <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-zinc-500 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-zinc-200"
          />
          {previewUrl && (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                className="mt-2 rounded-md max-h-48 w-full object-contain bg-zinc-50"
              />
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting}
                className="mt-2 w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {extracting ? "Extracting..." : "Extract workout details with AI"}
              </button>
              {extractError && <p className="text-sm text-red-600">{extractError}</p>}
            </>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">
            Voice note <span className="text-zinc-400 font-normal">(optional)</span>
          </p>
          <div className="flex gap-2">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={voiceExtracting}
                className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                <span className="size-2 rounded-full bg-red-500 inline-block" />
                {audioBlob ? "Re-record" : "Record"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <span className="size-2 rounded-sm bg-red-500 inline-block animate-pulse" />
                Stop
              </button>
            )}
          </div>
          {audioUrl && (
            <>
              <audio src={audioUrl} controls className="mt-2 w-full h-10" />
              <button
                type="button"
                onClick={handleVoiceExtract}
                disabled={voiceExtracting}
                className="mt-2 w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {voiceExtracting ? "Extracting..." : "Extract workout details with AI"}
              </button>
            </>
          )}
          {voiceError && <p className="text-sm text-red-600">{voiceError}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Movement standards, scaling options, notes..."
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">How is it scored?</p>
          <div className="grid grid-cols-2 gap-2">
            {METRIC_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer flex-col rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 has-checked:border-zinc-900 has-checked:bg-zinc-50"
              >
                <input
                  type="radio"
                  name="metric_type"
                  value={opt.value}
                  required
                  checked={metricType === opt.value}
                  onChange={() => setMetricType(opt.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-zinc-400">{opt.hint}</span>
              </label>
            ))}
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "..." : "Post workout"}
        </button>
      </form>
    </main>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
