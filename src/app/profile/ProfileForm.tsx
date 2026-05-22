"use client";

import { useActionState } from "react";
import { updateDisplayName } from "./actions";

type State = { error: string } | { success: true } | null;

export function ProfileForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState<State, FormData>(updateDisplayName, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={50}
          defaultValue={currentName}
          placeholder="Your name"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p className="text-xs text-zinc-400">
          Shown on the leaderboard, comments, and members list.
        </p>
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-green-600">Display name updated.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
