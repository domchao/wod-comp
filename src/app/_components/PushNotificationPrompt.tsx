"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { subscribeUser } from "@/app/notifications/actions";

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

const DISMISSED_KEY = "push-prompt-dismissed";
const AUTO_DISMISS_MS = 10_000;

function saveDismissed() {
  // localStorage can throw in private-browsing modes or when storage is full;
  // guard so the in-memory state update always runs even if persistence fails.
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // ignore
  }
}

function getStoredDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function PushNotificationPrompt() {
  const [state, setState] = useState<State>(getInitialPushState);

  // useSyncExternalStore provides an SSR-safe way to read localStorage: the
  // server snapshot always returns false (no localStorage on the server), while
  // the client snapshot reads the real value.  React suppresses the hydration
  // mismatch for external stores, so a previously-dismissed user never sees
  // the banner after a page reload even though the server-rendered HTML showed it.
  const dismissedInStorage = useSyncExternalStore(
    subscribeToStorage,
    getStoredDismissed,
    () => false
  );

  // Track same-tab dismissal separately: the browser storage event does not
  // fire for writes made in the same tab, so dismissedInStorage won't update
  // until the next render triggered by this state.
  const [dismissedInSession, setDismissedInSession] = useState(false);

  const dismissed = dismissedInStorage || dismissedInSession;

  function dismiss() {
    saveDismissed();
    setDismissedInSession(true);
  }

  useEffect(() => {
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // dismiss is stable (saveDismissed is module-level, setDismissedInSession is from useState)
  }, []);

  useEffect(() => {
    if (state !== "idle") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setState("subscribed");
      })
      .catch(console.error);
    // state is intentionally read from mount-time closure — re-running on
    // state changes would re-check getSubscription() after unsubscribe,
    // overwriting the idle state back to subscribed before the user sees the prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enable() {
    // On Android Chrome, pushManager.subscribe() does not trigger the OS
    // notification permission dialog — requestPermission() must be called first.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      setState("subscribed");
      await subscribeUser(JSON.parse(JSON.stringify(sub)));
    } catch {
      dismiss();
    }
  }

  if (state === "unsupported" || state === "denied" || state === "subscribed" || dismissed)
    return null;

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
                type="button"
                onClick={enable}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                Enable
              </button>
              <button
                type="button"
                onClick={dismiss}
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
