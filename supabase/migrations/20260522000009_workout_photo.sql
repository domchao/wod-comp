-- Add photo_url to workouts
ALTER TABLE workouts ADD COLUMN photo_url TEXT;

-- Create storage bucket for workout photos (public so image URLs are directly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-photos', 'workout-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: group members can read workout photos
CREATE POLICY "workout photos: read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'workout-photos');

-- Authenticated users can upload workout photos (permission enforced in server action)
CREATE POLICY "workout photos: insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workout-photos');

-- Authenticated users can delete workout photos (for replacement on edit)
CREATE POLICY "workout photos: delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'workout-photos');
