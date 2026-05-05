-- 071_user_avatars_bucket.sql
-- Storage bucket + RLS policies for user-uploaded profile avatars.
--
-- Bucket layout: <user_id>/<filename>.<ext>
--   e.g. abc-123-uuid/avatar.png
-- That folder structure lets the RLS policies key off the first
-- path segment matching auth.uid() — each user can only write
-- inside their own folder, but anyone can read.
--
-- File size cap: 2 MB (matches the action-side validation).
-- Allowed MIME: PNG, JPEG, WebP. SVG is excluded for avatar
-- uploads to keep XSS surface narrow.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read: avatars are shown on public profile pages
CREATE POLICY "Public can read user-avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

-- Authenticated users can upload only inside their own user_id folder
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can replace their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can remove their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
