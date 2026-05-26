"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "../comments/actions";
import { Avatar } from "@/app/_components/Avatar";

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { name: string; avatar_url: string | null };
};

type State = { error: string } | { success: true } | null;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CommentThread({
  workoutId,
  groupId,
  currentUserId,
  comments,
}: {
  workoutId: string;
  groupId: string;
  currentUserId: string;
  comments: Comment[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<State, FormData>(addComment, null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Trash talk</h2>

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2 text-sm">
              <Avatar src={comment.profiles.avatar_url} name={comment.profiles.name} size="sm" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-xs">{comment.profiles.name}</span>
                  <span className="text-xs text-zinc-400">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300">{comment.body}</p>
              </div>
              {comment.user_id === currentUserId && (
                <form action={deleteComment}>
                  <input type="hidden" name="comment_id" value={comment.id} />
                  <input type="hidden" name="group_id" value={groupId} />
                  <button
                    type="submit"
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={action} className="space-y-2">
        <input type="hidden" name="workout_id" value={workoutId} />
        <input type="hidden" name="group_id" value={groupId} />
        <textarea
          name="body"
          rows={2}
          maxLength={500}
          placeholder="Say something..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
        {state && "error" in state && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "..." : "Post"}
        </button>
      </form>
    </div>
  );
}
