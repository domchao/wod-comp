-- Grant anon role SELECT access on tables needed by public share pages.
-- Share URLs (/share/workout, /share/result, /share/weekly-results) are
-- reached without a session cookie (e.g. from a WhatsApp link), so they
-- cannot rely on authenticated RLS policies.

GRANT SELECT ON public.groups TO anon;
GRANT SELECT ON public.workouts TO anon;
GRANT SELECT ON public.submissions TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.group_members TO anon;
GRANT SELECT ON public.setter_overrides TO anon;

CREATE POLICY "groups: anon read" ON groups
  FOR SELECT TO anon USING (true);

CREATE POLICY "workouts: anon read" ON workouts
  FOR SELECT TO anon USING (true);

CREATE POLICY "submissions: anon read" ON submissions
  FOR SELECT TO anon USING (true);

CREATE POLICY "profiles: anon read" ON profiles
  FOR SELECT TO anon USING (true);

CREATE POLICY "group_members: anon read" ON group_members
  FOR SELECT TO anon USING (true);

CREATE POLICY "setter_overrides: anon read" ON setter_overrides
  FOR SELECT TO anon USING (true);
