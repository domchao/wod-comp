CREATE POLICY "workouts: update as admin" ON workouts
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = workouts.group_id
        AND groups.admin_user_id = auth.uid()
    )
  );

CREATE POLICY "workouts: delete as admin" ON workouts
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = workouts.group_id
        AND groups.admin_user_id = auth.uid()
    )
  );
