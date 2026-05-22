"use client";

import { useActionState } from "react";
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

  return (
    <main className="mx-auto max-w-lg p-6 space-y-6">
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
            placeholder="e.g. 21-15-9 Thrusters and Pull-ups"
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
                className="flex cursor-pointer flex-col rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
              >
                <input
                  type="radio"
                  name="metric_type"
                  value={opt.value}
                  required
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
