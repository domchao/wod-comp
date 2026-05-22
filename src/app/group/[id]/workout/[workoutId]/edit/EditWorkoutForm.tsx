"use client";

import { useActionState } from "react";
import { updateWorkout } from "../../actions";

type State = { error: string } | null;

type Workout = {
  id: string;
  title: string;
  description: string | null;
  metric_type: string;
};

const METRIC_OPTIONS = [
  { value: "time", label: "For time", hint: "lower is better" },
  { value: "reps", label: "Max reps", hint: "higher is better" },
  { value: "weight", label: "Max weight", hint: "higher is better" },
  { value: "rounds", label: "AMRAP", hint: "rounds + reps" },
];

export function EditWorkoutForm({ groupId, workout }: { groupId: string; workout: Workout }) {
  const [state, action, pending] = useActionState<State, FormData>(updateWorkout, null);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="workout_id" value={workout.id} />
      <input type="hidden" name="group_id" value={groupId} />

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
        <label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={workout.description ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">How is it scored?</p>
        <div className="grid grid-cols-2 gap-2">
          {METRIC_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer flex-col rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
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
