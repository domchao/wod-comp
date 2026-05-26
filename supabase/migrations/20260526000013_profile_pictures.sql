-- Create storage bucket for profile pictures (public so image URLs are directly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can read any profile picture
CREATE POLICY "profile pictures: read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pictures');

-- Users can only upload to their own folder (path = {user_id}/{filename})
CREATE POLICY "profile pictures: insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own profile pictures (for replacement on re-upload)
CREATE POLICY "profile pictures: delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);
