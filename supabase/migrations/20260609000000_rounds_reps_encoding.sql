-- Migrate existing "rounds" submissions to the new rounds+reps encoding.
-- Values are now stored as: rounds * 10000 + reps.
-- Old submissions only have a rounds count, so multiply by 10000 (reps = 0).
-- The condition value < 10000 prevents re-applying this migration if run twice.
UPDATE submissions
SET value = value * 10000
WHERE workout_id IN (
  SELECT id FROM workouts WHERE metric_type = 'rounds'
)
AND value < 10000;
