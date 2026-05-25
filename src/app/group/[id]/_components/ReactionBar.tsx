"use client";

import { useOptimistic, useTransition } from "react";
import { toggleReaction } from "../reactions/actions";

const EMOJIS = ["🔥", "💪", "👏", "😂"];

type Reaction = { user_id: string; emoji: string };

export function ReactionBar({
  submissionId,
  groupId,
  currentUserId,
  reactions,
}: {
  submissionId: string;
  groupId: string;
  currentUserId: string;
  reactions: Reaction[];
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticReactions, updateOptimistic] = useOptimistic(
    reactions,
    (state: Reaction[], { emoji, adding }: { emoji: string; adding: boolean }) =>
      adding
        ? [...state, { user_id: currentUserId, emoji }]
        : state.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
  );

  function handleClick(emoji: string) {
    const hasReacted = optimisticReactions.some(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );
    startTransition(async () => {
      updateOptimistic({ emoji, adding: !hasReacted });
      await toggleReaction(groupId, submissionId, emoji);
    });
  }

  return (
    <div className="group flex gap-1 flex-wrap">
      {EMOJIS.map((emoji) => {
        const count = optimisticReactions.filter((r) => r.emoji === emoji).length;
        const reacted = optimisticReactions.some(
          (r) => r.emoji === emoji && r.user_id === currentUserId
        );
        return (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            disabled={isPending}
            className={`flex items-center gap-0.5 rounded-full px-2 py-1 md:py-0.5 text-xs transition-opacity duration-150 ${
              reacted
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
