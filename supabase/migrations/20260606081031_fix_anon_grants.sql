-- Re-apply anon SELECT grants. The previous migration
-- (20260605000019_share_anon_read) appears to have been recorded as applied
-- without its SQL executing — anon role still gets 403 on all share tables.

GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT ON public.groups           TO anon;
GRANT SELECT ON public.workouts         TO anon;
GRANT SELECT ON public.submissions      TO anon;
GRANT SELECT ON public.profiles         TO anon;
GRANT SELECT ON public.group_members    TO anon;
GRANT SELECT ON public.setter_overrides TO anon;

-- Create policies only if they don't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'groups: anon read'
  ) THEN
    EXECUTE 'CREATE POLICY "groups: anon read" ON groups FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'workouts: anon read'
  ) THEN
    EXECUTE 'CREATE POLICY "workouts: anon read" ON workouts FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'submissions' AND policyname = 'submissions: anon read'
  ) THEN
    EXECUTE 'CREATE POLICY "submissions: anon read" ON submissions FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles: anon read'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles: anon read" ON profiles FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members: anon read'
  ) THEN
    EXECUTE 'CREATE POLICY "group_members: anon read" ON group_members FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'setter_overrides' AND policyname = 'setter_overrides: anon read'
  ) THEN
    EXECUTE 'CREATE POLICY "setter_overrides: anon read" ON setter_overrides FOR SELECT TO anon USING (true)';
  END IF;
END $$;
