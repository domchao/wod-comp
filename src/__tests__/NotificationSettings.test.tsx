import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationSettings } from "@/app/settings/NotificationSettings";
import { subscribeUser, unsubscribeUser } from "@/app/notifications/actions";

vi.mock("@/app/notifications/actions", () => ({
  subscribeUser: vi.fn().mockResolvedValue({ success: true }),
  unsubscribeUser: vi.fn().mockResolvedValue({ success: true }),
}));

const MOCK_SUB = {
  endpoint: "https://push.example.com/sub-1",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
  unsubscribe: vi.fn().mockResolvedValue(true),
} as unknown as PushSubscription;

function stubPushSupport({
  existingSub = null as PushSubscription | null,
  permission = "default" as NotificationPermission,
} = {}) {
  const subscribe = vi.fn().mockResolvedValue(MOCK_SUB);
  const getSubscription = vi.fn().mockResolvedValue(existingSub);
  const registration = { pushManager: { getSubscription, subscribe } };

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
    value: { permission },
    writable: true,
    configurable: true,
  });

  return { subscribe, getSubscription };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "BKp1uLTSVynXFa65Xkl1gO4LIXUfA7KcY-sUeOtlyvARyDHWOrywFkTfZmiqjwGciqf5HnoStlQ8HJm7LHGy8wU"
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as unknown as Record<string, unknown>).PushManager;
});

describe("NotificationSettings", () => {
  describe("unsupported environments", () => {
    it("shows unsupported message when PushManager is not available", async () => {
      render(<NotificationSettings />);
      await waitFor(() => {
        expect(screen.getByText(/not supported/i)).toBeInTheDocument();
      });
    });

    it("shows blocked message when notification permission is denied", async () => {
      stubPushSupport({ permission: "denied" });
      render(<NotificationSettings />);
      await waitFor(() => {
        expect(screen.getByText(/blocked/i)).toBeInTheDocument();
      });
    });
  });

  describe("unsubscribed state", () => {
    it("shows the Enable button when not subscribed", async () => {
      stubPushSupport();
      render(<NotificationSettings />);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument();
      });
    });
  });

  describe("already subscribed state", () => {
    it("shows the Mute button when a subscription already exists", async () => {
      stubPushSupport({ existingSub: MOCK_SUB });
      render(<NotificationSettings />);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument();
      });
    });

    it("re-syncs the existing subscription to the server on mount", async () => {
      stubPushSupport({ existingSub: MOCK_SUB });
      render(<NotificationSettings />);
      await waitFor(() => {
        expect(vi.mocked(subscribeUser)).toHaveBeenCalledOnce();
      });
    });

    it("clicking Mute calls subscription.unsubscribe and unsubscribeUser", async () => {
      stubPushSupport({ existingSub: MOCK_SUB });
      const user = userEvent.setup();
      render(<NotificationSettings />);

      await waitFor(() => screen.getByRole("button", { name: /mute/i }));
      await user.click(screen.getByRole("button", { name: /mute/i }));

      await waitFor(() => {
        expect(vi.mocked(MOCK_SUB.unsubscribe)).toHaveBeenCalledOnce();
        expect(vi.mocked(unsubscribeUser)).toHaveBeenCalledWith(MOCK_SUB.endpoint);
      });
    });

    it("shows the Enable button after muting", async () => {
      stubPushSupport({ existingSub: MOCK_SUB });
      const user = userEvent.setup();
      render(<NotificationSettings />);

      await waitFor(() => screen.getByRole("button", { name: /mute/i }));
      await user.click(screen.getByRole("button", { name: /mute/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument();
      });
    });
  });

  describe("enabling", () => {
    it("clicking Enable calls pushManager.subscribe and subscribeUser", async () => {
      const { subscribe } = stubPushSupport();
      const user = userEvent.setup();
      render(<NotificationSettings />);

      await waitFor(() => screen.getByRole("button", { name: /enable/i }));
      await user.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(subscribe).toHaveBeenCalledOnce();
        expect(vi.mocked(subscribeUser)).toHaveBeenCalledOnce();
      });
    });

    it("shows the Mute button after enabling", async () => {
      stubPushSupport();
      const user = userEvent.setup();
      render(<NotificationSettings />);

      await waitFor(() => screen.getByRole("button", { name: /enable/i }));
      await user.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument();
      });
    });
  });
});
