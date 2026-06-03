"use client";

import { useEffect, useState } from "react";
import { subscribeUser, unsubscribeUser } from "@/app/notifications/actions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "idle" | "subscribed" | "denied" | "unsupported";

function getInitialPushState(): State {
  if (typeof window === "undefined") return "idle";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return "denied";
  return "idle";
}

export function NotificationSettings() {
  const [state, setState] = useState<State>(getInitialPushState);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (state !== "idle") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setSubscription(sub);
          setState("subscribed");
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enable() {
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      setSubscription(sub);
      setState("subscribed");
      await subscribeUser(JSON.parse(JSON.stringify(sub)));
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setPending(true);
    try {
      await subscription.unsubscribe();
      await unsubscribeUser(subscription.endpoint);
      setSubscription(null);
      setState("idle");
    } finally {
      setPending(false);
    }
  }

  if (state === "unsupported") {
    return (
      <p className="text-sm text-zinc-500">Push notifications are not supported in this browser.</p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-zinc-500">
        Notifications are blocked. Enable them in your browser settings to receive updates.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Push notifications</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {state === "subscribed"
            ? "You'll be notified when workouts are posted and results are logged."
            : "Get notified when workouts are posted and results are logged."}
        </p>
      </div>
      <button
        onClick={state === "subscribed" ? disable : enable}
        disabled={pending}
        className="ml-4 shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {pending ? "..." : state === "subscribed" ? "Mute" : "Enable"}
      </button>
    </div>
  );
}
