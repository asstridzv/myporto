-- Admin policies: allow admin role to manage all drafts, media, and profiles

-- Admin can read all drafts
CREATE POLICY "Admin can read all drafts" ON public.drafts
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can delete any draft
CREATE POLICY "Admin can delete any draft" ON public.drafts
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can update any draft
CREATE POLICY "Admin can update any draft" ON public.drafts
  FOR UPDATE TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can read all draft media
CREATE POLICY "Admin can read all draft media" ON public.draft_media
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can delete any draft media
CREATE POLICY "Admin can delete any draft media" ON public.draft_media
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can read all profiles
CREATE POLICY "Admin can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can read all storage objects
CREATE POLICY "Admin can read all storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

-- Admin can delete any storage object
CREATE POLICY "Admin can delete all storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::app_role));

-- ============================================
-- ASSIGN ADMIN ROLE TO YOUR ACCOUNT
-- Replace the email below with YOUR email address
-- ============================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING;
