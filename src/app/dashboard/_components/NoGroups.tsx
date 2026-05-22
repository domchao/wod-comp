"use client";

import { useActionState } from "react";
import { createGroup, joinGroup } from "@/app/groups/actions";
import { signOut } from "@/app/auth/actions";

type State = { error: string } | null;

export function NoGroups() {
  const [createState, createAction, createPending] = useActionState<State, FormData>(
    createGroup,
    null
  );
  const [joinState, joinAction, joinPending] = useActionState<State, FormData>(joinGroup, null);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Get started</h1>
          <form action={signOut}>
            <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-900">
              Sign out
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Create a group
          </h2>
          <form action={createAction} className="space-y-3">
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Monday crew"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            {createState?.error && <p className="text-sm text-red-600">{createState.error}</p>}
            <button
              type="submit"
              disabled={createPending}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {createPending ? "..." : "Create group"}
            </button>
          </form>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs text-zinc-500">
            <span className="bg-white px-2">or</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Join a group
          </h2>
          <form action={joinAction} className="space-y-3">
            <input
              name="invite_code"
              type="text"
              required
              placeholder="Enter invite code"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            {joinState?.error && <p className="text-sm text-red-600">{joinState.error}</p>}
            <button
              type="submit"
              disabled={joinPending}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              {joinPending ? "..." : "Join group"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
