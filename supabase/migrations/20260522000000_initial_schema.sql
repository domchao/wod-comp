-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE metric_type AS ENUM ('time', 'reps', 'weight', 'rounds');


-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE groups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  invite_code    TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  admin_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE workouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  week_start_date  DATE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  metric_type      metric_type NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id    UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value         NUMERIC NOT NULL,
  notes         TEXT,
  photo_url     TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workout_id, user_id)
);


-- ============================================================
-- Auto-create profile on sign up
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions  ENABLE ROW LEVEL SECURITY;

-- profiles: anyone authenticated can read; users can only update their own
CREATE POLICY "profiles: read" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles: update own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- groups: members can read their groups; authenticated users can create
CREATE POLICY "groups: read as member" ON groups
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "groups: create" ON groups
  FOR INSERT TO authenticated WITH CHECK (true);

-- group_members: members can see who else is in their groups; authenticated users can join
CREATE POLICY "group_members: read" ON group_members
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members: join" ON group_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- workouts: group members can read; group admin can create
CREATE POLICY "workouts: read as member" ON workouts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = workouts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "workouts: create as admin" ON workouts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = workouts.group_id
        AND groups.admin_user_id = auth.uid()
    )
  );

-- submissions: group members can read all; users can insert and update their own
CREATE POLICY "submissions: read as member" ON submissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_members
      JOIN workouts ON workouts.id = submissions.workout_id
      WHERE group_members.group_id = workouts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "submissions: create own" ON submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "submissions: update own" ON submissions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
