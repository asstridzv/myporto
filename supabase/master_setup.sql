-- ============================================================
-- PINPOST MASTER SETUP (LENGKAP: USER + GALLERY + ADMIN)
-- Aman dijalankan berkali-kali (Idempotent)
-- ============================================================

-- 1. TABEL DASAR
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  handle text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'Untitled draft',
  text text DEFAULT '',
  format_key text DEFAULT 'post_square',
  platforms text[] DEFAULT '{instagram,linkedin,x,facebook}',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.drafts ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.draft_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.drafts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  uploaded boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 3. FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

-- 4. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('draft-media', 'draft-media', false) ON CONFLICT (id) DO NOTHING;

-- 6. POLICIES (CLEANUP & RECREATE)
-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Anyone can read public profiles" ON public.profiles FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.drafts WHERE drafts.user_id = profiles.id AND drafts.is_public = true));
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role('admin'));

-- Drafts
DROP POLICY IF EXISTS "Users can CRUD own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Anyone can read public drafts" ON public.drafts;
DROP POLICY IF EXISTS "Admin can read all drafts" ON public.drafts;
DROP POLICY IF EXISTS "Admin can delete any draft" ON public.drafts;
DROP POLICY IF EXISTS "Admin can update any draft" ON public.drafts;

CREATE POLICY "Users can CRUD own drafts" ON public.drafts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read public drafts" ON public.drafts FOR SELECT TO anon USING (is_public = true);
CREATE POLICY "Admin can read all drafts" ON public.drafts FOR SELECT TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Admin can delete any draft" ON public.drafts FOR DELETE TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Admin can update any draft" ON public.drafts FOR UPDATE TO authenticated USING (public.has_role('admin'));

-- Storage (Avatars & Media)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload draft media" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own draft media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read public draft media files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read all storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete all storage" ON storage.objects;

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read own avatar" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload draft media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'draft-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read own draft media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'draft-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can read public draft media files" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'draft-media');
CREATE POLICY "Admin can read all storage" ON storage.objects FOR SELECT TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Admin can delete all storage" ON storage.objects FOR DELETE TO authenticated USING (public.has_role('admin'));

-- 7. ASSIGN ADMIN ROLE
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'acit@acit.com'
ON CONFLICT (user_id, role) DO NOTHING;
