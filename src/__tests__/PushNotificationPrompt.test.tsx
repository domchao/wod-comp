import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationPrompt } from "@/app/_components/PushNotificationPrompt";
import { subscribeUser } from "@/app/notifications/actions";

vi.mock("@/app/notifications/actions", () => ({
  subscribeUser: vi.fn().mockResolvedValue({ success: true }),
  unsubscribeUser: vi.fn().mockResolvedValue({ success: true }),
}));

const MOCK_SUB = {
  endpoint: "https://push.example.com/sub-1",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
} as unknown as PushSubscription;

function stubPushSupport({
  existingSub = null as PushSubscription | null,
  permission = "default" as NotificationPermission,
  grantedByPrompt = true,
} = {}) {
  const subscribe = vi.fn().mockResolvedValue(MOCK_SUB);
  const getSubscription = vi.fn().mockResolvedValue(existingSub);
  const registration = { pushManager: { getSubscription, subscribe } };
  const requestPermission = vi.fn().mockResolvedValue(grantedByPrompt ? "granted" : "denied");

  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
    writable: true,
    configurable: true,
  });

  (window as unknown as Record<string, unknown>).PushManager = class {};

  Object.defineProperty(window, "Notification", {
    value: { permission, requestPermission },
    writable: true,
    configurable: true,
  });

  return { subscribe, getSubscription, requestPermission };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Valid base64url VAPID public key so urlBase64ToUint8Array doesn't throw
  vi.stubEnv(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "BKp1uLTSVynXFa65Xkl1gO4LIXUfA7KcY-sUeOtlyvARyDHWOrywFkTfZmiqjwGciqf5HnoStlQ8HJm7LHGy8wU"
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as unknown as Record<string, unknown>).PushManager;
});

describe("PushNotificationPrompt", () => {
  describe("unsupported environments", () => {
    it("renders nothing when PushManager is not available", async () => {
      // Do not call stubPushSupport — PushManager is absent by default in jsdom
      const { container } = render(<PushNotificationPrompt />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("renders nothing when notification permission is denied", async () => {
      stubPushSupport({ permission: "denied" });
      const { container } = render(<PushNotificationPrompt />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe("unsubscribed state", () => {
    it("shows the Enable and Not now buttons when supported and not subscribed", async () => {
      stubPushSupport();
      render(<PushNotificationPrompt />);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /not now/i })).toBeInTheDocument();
      });
    });

    it("clicking Not now hides the prompt permanently for the session", async () => {
      stubPushSupport();
      const user = userEvent.setup();
      const { container } = render(<PushNotificationPrompt />);

      await waitFor(() => screen.getByRole("button", { name: /not now/i }));
      await user.click(screen.getByRole("button", { name: /not now/i }));

      expect(container.firstChild).toBeNull();
    });
  });

  describe("subscribing", () => {
    it("hides the prompt when the OS permission dialog is denied", async () => {
      stubPushSupport({ grantedByPrompt: false });
      const user = userEvent.setup();
      const { container } = render(<PushNotificationPrompt />);

      await waitFor(() => screen.getByRole("button", { name: /enable/i }));
      await user.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("clicking Enable calls pushManager.subscribe and subscribeUser", async () => {
      const { subscribe } = stubPushSupport();
      const user = userEvent.setup();
      render(<PushNotificationPrompt />);

      await waitFor(() => screen.getByRole("button", { name: /enable/i }));
      await user.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(subscribe).toHaveBeenCalledOnce();
        expect(vi.mocked(subscribeUser)).toHaveBeenCalledOnce();
      });
    });

    it("passes serialized subscription to subscribeUser", async () => {
      stubPushSupport();
      const user = userEvent.setup();
      render(<PushNotificationPrompt />);

      await waitFor(() => screen.getByRole("button", { name: /enable/i }));
      await user.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(vi.mocked(subscribeUser)).toHaveBeenCalledWith(
          expect.objectContaining({ endpoint: MOCK_SUB.endpoint })
        );
      });
    });

    it("hides the prompt after subscribing", async () => {
      stubPushSupport();
      const user = userEvent.setup();
      const { container } = render(<PushNotificationPrompt />);

      await waitFor(() => screen.getByRole("button", { name: /enable/i }));
      await user.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe("already subscribed state", () => {
    it("renders nothing when a subscription already exists", async () => {
      stubPushSupport({ existingSub: MOCK_SUB });
      const { container } = render(<PushNotificationPrompt />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
