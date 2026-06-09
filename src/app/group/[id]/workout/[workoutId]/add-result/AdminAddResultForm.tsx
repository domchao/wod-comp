"use client";

import { useActionState, useState } from "react";
import { adminCreateSubmission } from "./actions";

type State = { error: string } | null;

type Workout = {
  title: string;
  description: string | null;
  metric_type: string;
};

const METRIC_CONFIG: Record<string, { label: string; placeholder: string; step: string }> = {
  reps: { label: "Reps completed", placeholder: "e.g. 45", step: "1" },
  weight: { label: "Weight lifted", placeholder: "e.g. 100", step: "0.5" },
  rounds: { label: "Rounds completed", placeholder: "e.g. 5", step: "1" },
};

export function AdminAddResultForm({
  groupId,
  workoutId,
  userId,
  workout,
  memberName,
}: {
  groupId: string;
  workoutId: string;
  userId: string;
  workout: Workout;
  memberName: string;
}) {
  const [state, action, pending] = useActionState<State, FormData>(adminCreateSubmission, null);
  const [rx, setRx] = useState(false);
  const isTime = workout.metric_type === "time";
  const metric = METRIC_CONFIG[workout.metric_type];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="workout_id" value={workoutId} />
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="rx" value={rx ? "true" : "false"} />

      <div className="rounded-lg border border-zinc-200 p-4 space-y-1">
        <p className="font-medium">{workout.title}</p>
        {workout.description && <p className="text-sm text-zinc-500">{workout.description}</p>}
        <p className="text-xs text-zinc-400 pt-1">
          Adding result for <span className="font-medium text-zinc-600">{memberName}</span>
        </p>
      </div>

      {isTime ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Time</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <label htmlFor="minutes" className="text-xs text-zinc-500">
                Minutes
              </label>
              <input
                id="minutes"
                name="minutes"
                type="number"
                required
                min="0"
                step="1"
                defaultValue={0}
                placeholder="0"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <span className="mt-5 text-zinc-400 font-medium">:</span>
            <div className="flex-1 space-y-1">
              <label htmlFor="seconds" className="text-xs text-zinc-500">
                Seconds
              </label>
              <input
                id="seconds"
                name="seconds"
                type="number"
                required
                min="0"
                max="59"
                step="1"
                defaultValue={0}
                placeholder="00"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor="value" className="text-sm font-medium">
            {metric?.label}
          </label>
          <input
            id="value"
            name="value"
            type="number"
            required
            min="0"
            step={metric?.step}
            placeholder={metric?.placeholder}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Rx</p>
        <button
          type="button"
          onClick={() => setRx((v) => !v)}
          aria-pressed={rx}
          className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
            rx
              ? "border-green-600 bg-green-600 text-white"
              : "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-600 dark:text-zinc-400"
          }`}
        >
          Rx
        </button>
        <p className="text-xs text-zinc-400">
          {rx ? "Marked as Rx — completed as prescribed" : "Not Rx — tap to mark as prescribed"}
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Scaling, how it felt, rx'd..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "..." : "Add result"}
      </button>
    </form>
  );
}
