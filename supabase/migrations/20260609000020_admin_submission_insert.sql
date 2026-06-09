-- Allow group admins to insert a submission on behalf of any member
CREATE POLICY "submissions: insert as group admin" ON submissions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      JOIN workouts ON workouts.group_id = groups.id
      WHERE workouts.id = submissions.workout_id
        AND groups.admin_user_id = auth.uid()
    )
  );
