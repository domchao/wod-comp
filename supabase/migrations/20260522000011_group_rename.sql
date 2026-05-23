-- Allow the group admin to update their group's name (and other fields).
-- USING checks the existing row; WITH CHECK ensures admin_user_id can't be
-- changed through this policy.
CREATE POLICY "groups: update as admin" ON groups
  FOR UPDATE TO authenticated
  USING     (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());
