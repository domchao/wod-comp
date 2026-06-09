import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { subscribeUser, unsubscribeUser } from "@/app/notifications/actions";

vi.mock("@/lib/supabase/server");

const USER_ID = "user-1";
const ENDPOINT = "https://push.example.com/sub-1";

const MOCK_SUB = {
  endpoint: ENDPOINT,
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

function buildSupabaseMock({ upsertError = null as string | null } = {}) {
  const deleteEq2 = vi.fn().mockResolvedValue({});
  const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq1 });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "push_subscriptions") {
        return {
          upsert: vi
            .fn()
            .mockResolvedValue({ error: upsertError ? { message: upsertError } : null }),
          delete: deleteMock,
        };
      }
      return {};
    }),
    deleteEq1,
    deleteEq2,
  };
}

function buildUnauthMock() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
});

describe("subscribeUser", () => {
  it("returns an error when the user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(buildUnauthMock() as never);
    const result = await subscribeUser(MOCK_SUB);
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("upserts the subscription and returns success", async () => {
    const mock = buildSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await subscribeUser(MOCK_SUB);

    expect(result).toEqual({ success: true });
    const upsertMock = mock.from.mock.results[0].value.upsert;
    expect(upsertMock).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        endpoint: MOCK_SUB.endpoint,
        p256dh: MOCK_SUB.keys.p256dh,
        auth_key: MOCK_SUB.keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );
  });

  it("returns an error when the upsert fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ upsertError: "unique constraint" }) as never
    );
    const result = await subscribeUser(MOCK_SUB);
    expect(result).toEqual({ error: "unique constraint" });
  });
});

describe("unsubscribeUser", () => {
  it("returns an error when the user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(buildUnauthMock() as never);
    const result = await unsubscribeUser(ENDPOINT);
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("deletes the subscription by user_id and endpoint, returns success", async () => {
    const mock = buildSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await unsubscribeUser(ENDPOINT);

    expect(result).toEqual({ success: true });
    expect(mock.deleteEq1).toHaveBeenCalledWith("user_id", USER_ID);
    expect(mock.deleteEq2).toHaveBeenCalledWith("endpoint", ENDPOINT);
  });
});
