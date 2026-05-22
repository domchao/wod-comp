-- The original group_members read policy was self-referential — it queried
-- group_members from within the group_members RLS check, causing a circular
-- dependency that returned no rows. Same issue affected the groups policy
-- which also subqueried group_members.
--
-- For this app groups and membership lists aren't sensitive. Workouts and
-- submissions remain member-gated.

DROP POLICY "groups: read as member" ON groups;
CREATE POLICY "groups: read" ON groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY "group_members: read" ON group_members;
CREATE POLICY "group_members: read" ON group_members
  FOR SELECT TO authenticated USING (true);
