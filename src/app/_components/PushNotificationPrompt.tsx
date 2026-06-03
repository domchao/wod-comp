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

export function PushNotificationPrompt() {
  const [state, setState] = useState<State>(getInitialPushState);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [dismissed, setDismissed] = useState(false);

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
    // state is intentionally read from mount-time closure — re-running on
    // state changes would re-check getSubscription() after unsubscribe,
    // overwriting the idle state back to subscribed before the user sees the prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    setSubscription(sub);
    setState("subscribed");
    await subscribeUser(JSON.parse(JSON.stringify(sub)));
  }

  async function disable() {
    if (!subscription) return;
    await subscription.unsubscribe();
    await unsubscribeUser(subscription.endpoint);
    setSubscription(null);
    setState("idle");
  }

  if (state === "unsupported" || state === "denied" || dismissed) return null;

  if (state === "subscribed") {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={disable}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
          title="Disable push notifications"
        >
          Mute notifications
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Stay in the loop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Get notified when workouts are posted and results are logged.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={enable}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                Enable
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-zinc-600 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
