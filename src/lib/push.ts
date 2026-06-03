import webpush from "web-push";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let vapidInitialised = false;
function ensureVapid() {
  if (vapidInitialised) return;
  webpush.setVapidDetails(
    "mailto:noreply@wodcomp.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidInitialised = true;
}

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth_key: string },
  payload: PushPayload
): Promise<{ staleId?: string }> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/" })
    );
    return {};
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { staleId: sub.id };
    console.error("push send error:", err);
    return {};
  }
}

export async function sendPushToGroupMembers(
  groupId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<void> {
  const supabase = adminClient();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (!members?.length) return;

  const userIds = members.map((m) => m.user_id as string).filter((id) => id !== excludeUserId);

  if (!userIds.length) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .in("user_id", userIds);

  if (!subs?.length) return;

  const results = await Promise.all(subs.map((s) => sendToSubscription(s, payload)));

  const staleIds = results.flatMap((r) => (r.staleId ? [r.staleId] : []));
  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
}
