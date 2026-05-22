-- Allow any group member to post a workout (rotation enforced in app layer)
DROP POLICY "workouts: create as admin" ON workouts;

CREATE POLICY "workouts: create as member" ON workouts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = workouts.group_id
        AND group_members.user_id = auth.uid()
    )
  );
