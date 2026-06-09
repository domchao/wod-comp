"use client";

import { useActionState, useState } from "react";
import { updateWorkout } from "../../actions";

type State = { error: string } | null;

type Workout = {
  id: string;
  title: string;
  description: string | null;
  metric_type: string;
  photo_url: string | null;
};

const METRIC_OPTIONS = [
  { value: "time", label: "For time", hint: "lower is better" },
  { value: "reps", label: "Max reps", hint: "higher is better" },
  { value: "weight", label: "Max weight", hint: "higher is better" },
  { value: "rounds", label: "Rounds and Reps", hint: "AMRAP — rounds + reps" },
];

export function EditWorkoutForm({ groupId, workout }: { groupId: string; workout: Workout }) {
  const [state, action, pending] = useActionState<State, FormData>(updateWorkout, null);

  const [title, setTitle] = useState(workout.title);
  const [description, setDescription] = useState(workout.description ?? "");
  const [metricType, setMetricType] = useState(workout.metric_type);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

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

  const displayPhotoUrl = previewUrl ?? workout.photo_url;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="workout_id" value={workout.id} />
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="existing_photo_url" value={workout.photo_url ?? ""} />

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
        {displayPhotoUrl && (
          <>
            <img
              src={displayPhotoUrl}
              alt={previewUrl ? "New photo preview" : "Current photo"}
              className="mt-2 rounded-md max-h-48 w-full object-contain bg-zinc-50"
            />
            {previewUrl && (
              <>
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
          </>
        )}
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
        {pending ? "..." : "Save changes"}
      </button>
    </form>
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
