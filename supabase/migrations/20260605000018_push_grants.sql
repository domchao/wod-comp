-- service_role needs SELECT on group_members to look up who is in a group
-- before sending push notifications. Without this, sendPushToGroupMembers
-- always gets an empty result and no pushes are ever delivered.
GRANT SELECT ON public.group_members TO service_role;

-- Allow service_role to delete stale push subscriptions (endpoint gone 404/410).
GRANT DELETE ON public.push_subscriptions TO service_role;

-- Upsert in subscribeUser uses ON CONFLICT DO UPDATE, which requires an
-- UPDATE policy. Without it the upsert fails when a row already exists,
-- so subscription key changes are never persisted.
CREATE POLICY "push_subscriptions: update own" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
