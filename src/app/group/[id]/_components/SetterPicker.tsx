"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { updateSetterOverride, clearSetterOverride } from "../setter/actions";

type Member = { id: string; name: string };

export function SetterPicker({
  groupId,
  weekStart,
  setterId,
  isOverridden,
  isMyTurn,
  members,
}: {
  groupId: string;
  weekStart: string;
  setterId: string;
  isOverridden: boolean;
  isMyTurn: boolean;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const currentSetter = members.find((m) => m.id === setterId);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function pickMember(userId: string) {
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const result = await updateSetterOverride(groupId, weekStart, userId);
      if (result && "error" in result) setError(result.error ?? null);
    });
  }

  function clearOverride() {
    setError(null);
    startTransition(async () => {
      const result = await clearSetterOverride(groupId, weekStart);
      if (result && "error" in result) setError(result.error ?? null);
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-sm text-zinc-500">
        {isMyTurn
          ? "Your turn to set the workout"
          : `${currentSetter?.name}'s turn to set the workout`}
      </p>

      <div className="relative flex items-center gap-1.5" ref={ref}>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-zinc-400 underline hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Change"}
        </button>

        {isOverridden && (
          <>
            <span className="text-xs text-zinc-400">·</span>
            <button
              type="button"
              disabled={isPending}
              onClick={clearOverride}
              title="Revert to natural rotation"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
            >
              manual
            </button>
          </>
        )}

        {open && (
          <div className="absolute left-0 top-full mt-1 w-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1 z-10">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMember(m.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  m.id === setterId
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {m.name}
                {m.id === setterId && <span className="ml-1 text-xs text-zinc-400">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
