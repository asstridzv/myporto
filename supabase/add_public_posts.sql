-- Add is_public column to drafts so users can publish posts publicly
ALTER TABLE public.drafts ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Allow anyone (including anonymous) to read public drafts
CREATE POLICY "Anyone can read public drafts" ON public.drafts
  FOR SELECT TO anon, authenticated USING (is_public = true);

-- Allow anyone to read media for public drafts
CREATE POLICY "Anyone can read public draft media" ON public.draft_media
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drafts
      WHERE drafts.id = draft_media.draft_id AND drafts.is_public = true
    )
  );

-- Allow anonymous to read storage objects for public drafts (draft-media bucket)
CREATE POLICY "Anyone can read public draft media files" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'draft-media');

-- Allow anonymous to read avatars for public profiles
CREATE POLICY "Anyone can read avatars" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'avatars');

-- Allow anyone to read profiles of users with public posts
CREATE POLICY "Anyone can read public profiles" ON public.profiles
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.drafts
      WHERE drafts.user_id = profiles.id AND drafts.is_public = true
    )
  );
