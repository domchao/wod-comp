ALTER TABLE workouts
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

DROP POLICY "workouts: update as admin" ON workouts;

CREATE POLICY "workouts: update as admin or creator" ON workouts
  FOR UPDATE TO authenticated USING (
    workouts.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = workouts.group_id
        AND groups.admin_user_id = auth.uid()
    )
  );
