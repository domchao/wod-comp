import { vi, describe, it, expect, beforeEach } from "vitest";
import webpush from "web-push";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendPushToGroupMembers } from "@/lib/push";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

const GROUP_ID = "group-1";
const USER_A = "user-a";
const USER_B = "user-b";

const SUB_A = {
  id: "sub-a",
  endpoint: "https://push.example.com/a",
  p256dh: "p256a",
  auth_key: "autha",
};
const SUB_B = {
  id: "sub-b",
  endpoint: "https://push.example.com/b",
  p256dh: "p256b",
  auth_key: "authb",
};

const PAYLOAD = { title: "New workout", body: "Go lift", url: "/group/group-1" };

function buildAdminMock({
  members = [] as { user_id: string }[],
  subscriptions = [] as (typeof SUB_A)[],
} = {}) {
  const deleteInMock = vi.fn().mockResolvedValue({});
  const mock = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "group_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: members }),
        };
      }
      if (table === "push_subscriptions") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: subscriptions }),
          delete: vi.fn().mockReturnValue({ in: deleteInMock }),
        };
      }
      return {};
    }),
    deleteInMock,
  };
  return mock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
});

describe("sendPushToGroupMembers", () => {
  it("does nothing when the group has no members", async () => {
    vi.mocked(createSupabaseClient).mockReturnValue(buildAdminMock() as never);
    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing when the only member is excluded", async () => {
    const mock = buildAdminMock({ members: [{ user_id: USER_A }] });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);
    await sendPushToGroupMembers(GROUP_ID, PAYLOAD, USER_A);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing when members have no push subscriptions", async () => {
    const mock = buildAdminMock({ members: [{ user_id: USER_A }], subscriptions: [] });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);
    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("sends a push to every subscription found", async () => {
    const mock = buildAdminMock({
      members: [{ user_id: USER_A }, { user_id: USER_B }],
      subscriptions: [SUB_A, SUB_B],
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: SUB_A.endpoint, keys: { p256dh: SUB_A.p256dh, auth: SUB_A.auth_key } },
      JSON.stringify({ title: PAYLOAD.title, body: PAYLOAD.body, url: PAYLOAD.url })
    );
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: SUB_B.endpoint, keys: { p256dh: SUB_B.p256dh, auth: SUB_B.auth_key } },
      JSON.stringify({ title: PAYLOAD.title, body: PAYLOAD.body, url: PAYLOAD.url })
    );
  });

  it("excludes the specified user's subscription", async () => {
    const mock = buildAdminMock({
      members: [{ user_id: USER_A }, { user_id: USER_B }],
      subscriptions: [SUB_B], // only USER_B after exclusion filter
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, PAYLOAD, USER_A);

    // Verify the DB query excluded USER_A
    const subsMock = mock.from.mock.results.find(
      (r) => mock.from.mock.calls[mock.from.mock.results.indexOf(r)]?.[0] === "push_subscriptions"
    );
    const inCall = subsMock?.value.in.mock?.calls[0];
    expect(inCall?.[1]).not.toContain(USER_A);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: SUB_B.endpoint }),
      expect.any(String)
    );
  });

  it("uses the payload url, defaulting to / when omitted", async () => {
    const mock = buildAdminMock({
      members: [{ user_id: USER_A }],
      subscriptions: [SUB_A],
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, { title: "T", body: "B" });

    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      JSON.stringify({ title: "T", body: "B", url: "/" })
    );
  });

  it("removes a stale subscription on HTTP 404", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 404 });
    const mock = buildAdminMock({
      members: [{ user_id: USER_A }],
      subscriptions: [SUB_A],
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);

    expect(mock.deleteInMock).toHaveBeenCalledWith("id", [SUB_A.id]);
  });

  it("removes a stale subscription on HTTP 410", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });
    const mock = buildAdminMock({
      members: [{ user_id: USER_A }],
      subscriptions: [SUB_A],
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);

    expect(mock.deleteInMock).toHaveBeenCalledWith("id", [SUB_A.id]);
  });

  it("does not delete subscriptions on other send errors", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 500 });
    const mock = buildAdminMock({
      members: [{ user_id: USER_A }],
      subscriptions: [SUB_A],
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);

    expect(mock.deleteInMock).not.toHaveBeenCalled();
  });

  it("only deletes stale subscriptions when a mix of results occurs", async () => {
    vi.mocked(webpush.sendNotification)
      .mockResolvedValueOnce({} as never) // SUB_A succeeds
      .mockRejectedValueOnce({ statusCode: 410 }); // SUB_B is stale

    const mock = buildAdminMock({
      members: [{ user_id: USER_A }, { user_id: USER_B }],
      subscriptions: [SUB_A, SUB_B],
    });
    vi.mocked(createSupabaseClient).mockReturnValue(mock as never);

    await sendPushToGroupMembers(GROUP_ID, PAYLOAD);

    expect(mock.deleteInMock).toHaveBeenCalledWith("id", [SUB_B.id]);
  });
});
