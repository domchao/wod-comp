CREATE POLICY "groups: delete as admin" ON groups
  FOR DELETE TO authenticated
  USING (admin_user_id = auth.uid());
