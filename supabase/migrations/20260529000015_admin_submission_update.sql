-- Allow group admins to update any submission within their group
CREATE POLICY "submissions: update as group admin" ON submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM groups
      JOIN workouts ON workouts.group_id = groups.id
      WHERE workouts.id = submissions.workout_id
        AND groups.admin_user_id = auth.uid()
    )
  );
