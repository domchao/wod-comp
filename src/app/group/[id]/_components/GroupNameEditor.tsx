"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameGroup } from "@/app/groups/actions";

export function GroupNameEditor({
  groupId,
  name,
  isAdmin,
}: {
  groupId: string;
  name: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const [inputValue, setInputValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEditing() {
    setInputValue(displayName);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = (formData.get("name") as string)?.trim();

    startTransition(async () => {
      const result = await renameGroup(null, formData);
      if (result && "error" in result) {
        setError(result.error ?? null);
      } else {
        if (newName) setDisplayName(newName);
        setEditing(false);
        setError(null);
        router.refresh();
      }
    });
  }

  if (!isAdmin || !editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{displayName}</h1>
        {isAdmin && (
          <button
            onClick={openEditing}
            aria-label="Rename group"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 2l2 2L4 12H2v-2L10 2z" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input type="hidden" name="group_id" value={groupId} />
      <input
        name="name"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        autoFocus
        required
        maxLength={100}
        className="text-2xl font-bold bg-transparent border-b border-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none w-48"
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
      >
        {isPending ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={cancelEditing}
        disabled={isPending}
        className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
      >
        Cancel
      </button>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </form>
  );
}
