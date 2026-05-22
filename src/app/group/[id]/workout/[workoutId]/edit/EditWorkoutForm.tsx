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
  { value: "rounds", label: "AMRAP", hint: "rounds + reps" },
];

export function EditWorkoutForm({ groupId, workout }: { groupId: string; workout: Workout }) {
  const [state, action, pending] = useActionState<State, FormData>(updateWorkout, null);
  const [description, setDescription] = useState(workout.description ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = e.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
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
          defaultValue={workout.title}
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
          <img
            src={displayPhotoUrl}
            alt={previewUrl ? "New photo preview" : "Current photo"}
            className="mt-2 rounded-md max-h-48 w-full object-contain bg-zinc-50"
          />
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        {/* description is controlled so it can be populated from photo extraction in future */}
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
                defaultChecked={workout.metric_type === opt.value}
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
