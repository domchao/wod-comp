"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { deleteGroup } from "@/app/groups/actions";

export function HeaderMenu({ groupId, isAdmin }: { groupId: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1 z-10">
          <Link
            href="/dashboard"
            className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            All groups
          </Link>
          <Link
            href={`/group/${groupId}/stats`}
            className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            My stats
          </Link>
          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            Edit profile
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
          {isAdmin && (
            <>
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <Link
                href={`/group/${groupId}/rotation`}
                className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Setter schedule
              </Link>
              {confirmDelete ? (
                <div className="px-4 py-2 space-y-2">
                  <p className="text-xs text-zinc-500">Delete this group and all its data?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("group_id", groupId);
                        startTransition(async () => {
                          const result = await deleteGroup(null, formData);
                          if (result && "error" in result) setDeleteError(result.error ?? null);
                        });
                      }}
                      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {isPending ? "Deleting..." : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Delete group
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
