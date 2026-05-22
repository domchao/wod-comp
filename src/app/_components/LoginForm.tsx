"use client";

import { useActionState, useState } from "react";
import { authWithEmail } from "@/app/auth/actions";

type State = { error: string } | null;

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<State, FormData>(authWithEmail, null);

  return (
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-center text-2xl font-bold">WOD Comp</h1>

      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        {next && <input type="hidden" name="next" value={next} />}

        {mode === "signup" && (
          <div className="space-y-1">
            <label htmlFor="display_name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              maxLength={50}
              placeholder="How you'll appear to your group"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-medium text-zinc-600 underline hover:text-zinc-900"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="font-medium text-zinc-600 underline hover:text-zinc-900"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
