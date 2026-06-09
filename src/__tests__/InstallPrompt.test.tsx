import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallPrompt } from "@/app/_components/InstallPrompt";

const DISMISSED_KEY = "pwa-install-dismissed";

function stubMatchMedia(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)" ? standalone : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    writable: true,
    configurable: true,
  });
}

function stubUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    writable: true,
    configurable: true,
  });
}

function fireBeforeInstallPrompt() {
  const fakePrompt = vi.fn().mockResolvedValue(undefined);
  const fakeUserChoice = Promise.resolve({ outcome: "accepted" as const });
  const event = Object.assign(new Event("beforeinstallprompt"), {
    prompt: fakePrompt,
    userChoice: fakeUserChoice,
  });
  window.dispatchEvent(event);
  return { fakePrompt, fakeUserChoice };
}

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36";
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem(DISMISSED_KEY);
  stubMatchMedia(false);
  stubUserAgent(ANDROID_UA);
});

afterEach(() => {
  localStorage.removeItem(DISMISSED_KEY);
});

describe("InstallPrompt", () => {
  describe("not-applicable states", () => {
    it("renders nothing while checking (before useEffect runs) then nothing in non-installable env", async () => {
      // No beforeinstallprompt fired, not iOS → stays 'checking' → null
      const { container } = render(<InstallPrompt />);
      // Initial render is null (checking state)
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when already in standalone mode", async () => {
      stubMatchMedia(true);
      const { container } = render(<InstallPrompt />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("renders nothing when previously dismissed via localStorage", async () => {
      localStorage.setItem(DISMISSED_KEY, "1");
      const { container } = render(<InstallPrompt />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe("iOS Safari", () => {
    beforeEach(() => {
      stubUserAgent(IOS_UA);
    });

    it("shows iOS install instructions on iOS Safari", async () => {
      render(<InstallPrompt />);
      await waitFor(() => {
        expect(screen.getByText(/install wod comp/i)).toBeInTheDocument();
        expect(screen.getByText(/share/i)).toBeInTheDocument();
        expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
      });
    });

    it("shows a Not now button on iOS", async () => {
      render(<InstallPrompt />);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /not now/i })).toBeInTheDocument();
      });
    });

    it("dismisses and hides the prompt on Not now, persisting to localStorage", async () => {
      const user = userEvent.setup();
      const { container } = render(<InstallPrompt />);

      await waitFor(() => screen.getByRole("button", { name: /not now/i }));
      await user.click(screen.getByRole("button", { name: /not now/i }));

      expect(container.firstChild).toBeNull();
      expect(localStorage.getItem(DISMISSED_KEY)).toBe("1");
    });

    it("does not show an Install button on iOS (manual instructions only)", async () => {
      render(<InstallPrompt />);
      await waitFor(() => screen.getByText(/add to home screen/i));
      expect(screen.queryByRole("button", { name: /^install$/i })).toBeNull();
    });
  });

  describe("Android / Chrome (beforeinstallprompt)", () => {
    it("shows Install and Not now buttons after beforeinstallprompt fires", async () => {
      render(<InstallPrompt />);
      fireBeforeInstallPrompt();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^install$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /not now/i })).toBeInTheDocument();
      });
    });

    it("clicking Install calls prompt() on the deferred event", async () => {
      const user = userEvent.setup();
      render(<InstallPrompt />);
      const { fakePrompt } = fireBeforeInstallPrompt();

      await waitFor(() => screen.getByRole("button", { name: /^install$/i }));
      await user.click(screen.getByRole("button", { name: /^install$/i }));

      expect(fakePrompt).toHaveBeenCalledOnce();
    });

    it("hides the prompt after the user accepts the install", async () => {
      const user = userEvent.setup();
      const { container } = render(<InstallPrompt />);
      fireBeforeInstallPrompt(); // userChoice resolves to "accepted"

      await waitFor(() => screen.getByRole("button", { name: /^install$/i }));
      await user.click(screen.getByRole("button", { name: /^install$/i }));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("hides the prompt even when the user dismisses the native dialog", async () => {
      const user = userEvent.setup();
      const { container } = render(<InstallPrompt />);

      const fakePrompt = vi.fn().mockResolvedValue(undefined);
      const event = Object.assign(new Event("beforeinstallprompt"), {
        prompt: fakePrompt,
        userChoice: Promise.resolve({ outcome: "dismissed" as const }),
      });
      window.dispatchEvent(event);

      await waitFor(() => screen.getByRole("button", { name: /^install$/i }));
      await user.click(screen.getByRole("button", { name: /^install$/i }));

      // Browser won't re-fire beforeinstallprompt for a while — hide regardless of outcome
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("clicking Not now hides the prompt and persists the dismissal", async () => {
      const user = userEvent.setup();
      const { container } = render(<InstallPrompt />);
      fireBeforeInstallPrompt();

      await waitFor(() => screen.getByRole("button", { name: /not now/i }));
      await user.click(screen.getByRole("button", { name: /not now/i }));

      expect(container.firstChild).toBeNull();
      expect(localStorage.getItem(DISMISSED_KEY)).toBe("1");
    });
  });
});
