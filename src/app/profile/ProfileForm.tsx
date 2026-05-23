"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "./actions";

export function ProfileForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateDisplayName(null, formData);
      if (result && "error" in result) {
        setError(result.error);
      } else {
        const newName = (formData.get("name") as string)?.trim();
        if (newName) setNameValue(newName);
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p className="text-xs text-zinc-400">
          Shown on the leaderboard, comments, and members list.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Display name updated.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
