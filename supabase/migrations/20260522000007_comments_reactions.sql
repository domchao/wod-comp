CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No separate id — the triple is the primary key, naturally enforces one
-- reaction per user per emoji per submission.
CREATE TABLE reactions (
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji          TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (submission_id, user_id, emoji)
);

ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- comments: readable by group members (via workout → group)
CREATE POLICY "comments: read as member" ON comments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_members
      JOIN workouts ON workouts.id = comments.workout_id
      WHERE group_members.group_id = workouts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- comments: group members can post
CREATE POLICY "comments: insert as member" ON comments
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      JOIN workouts ON workouts.id = comments.workout_id
      WHERE group_members.group_id = workouts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- comments: users can delete their own
CREATE POLICY "comments: delete own" ON comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- reactions: readable by group members (via submission → workout → group)
CREATE POLICY "reactions: read as member" ON reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM submissions
      JOIN workouts ON workouts.id = submissions.workout_id
      JOIN group_members ON group_members.group_id = workouts.group_id
      WHERE submissions.id = reactions.submission_id
        AND group_members.user_id = auth.uid()
    )
  );

-- reactions: group members can react
CREATE POLICY "reactions: insert as member" ON reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM submissions
      JOIN workouts ON workouts.id = submissions.workout_id
      JOIN group_members ON group_members.group_id = workouts.group_id
      WHERE submissions.id = reactions.submission_id
        AND group_members.user_id = auth.uid()
    )
  );

-- reactions: users can remove their own
CREATE POLICY "reactions: delete own" ON reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reactions TO authenticated;
