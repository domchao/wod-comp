CREATE TABLE setter_overrides (
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, week_start_date)
);

ALTER TABLE setter_overrides ENABLE ROW LEVEL SECURITY;

-- Group members can read overrides for their groups
CREATE POLICY "setter_overrides: select for members" ON setter_overrides
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = setter_overrides.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- Only the group admin can insert, update, or delete overrides
CREATE POLICY "setter_overrides: write as admin" ON setter_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = setter_overrides.group_id
        AND groups.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = setter_overrides.group_id
        AND groups.admin_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON setter_overrides TO authenticated;
