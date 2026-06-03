"use client";

import { useEffect, useState } from "react";

type InstallState = "checking" | "not-applicable" | "android" | "ios";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  );
}

function isIosSafari() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    /safari/i.test(navigator.userAgent) &&
    !/crios|fxios|opios|mercury/i.test(navigator.userAgent)
  );
}

const DISMISSED_KEY = "pwa-install-dismissed";

function getInitialInstallState(): InstallState {
  if (typeof window === "undefined") return "checking";
  if (localStorage.getItem(DISMISSED_KEY) === "1") return "not-applicable";
  if (isInStandaloneMode()) return "not-applicable";
  if (isIosSafari()) return "ios";
  return "checking";
}

export function InstallPrompt() {
  const [state, setState] = useState<InstallState>(getInitialInstallState);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (state !== "checking") return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("android");
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [state]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setState("not-applicable");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setState("not-applicable");
    setDeferredPrompt(null);
  }

  if (state === "checking" || state === "not-applicable") return null;

  if (state === "ios") {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
        <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5" aria-hidden="true">
              📲
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Install WOD Comp
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tap the <span className="font-medium text-gray-700 dark:text-gray-300">Share</span>{" "}
                button then{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Add to Home Screen
                </span>
                .
              </p>
              <button
                onClick={dismiss}
                className="mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5" aria-hidden="true">
            📲
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Install WOD Comp
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Add to your home screen for the best experience and push notifications.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={install}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                Install
              </button>
              <button
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
