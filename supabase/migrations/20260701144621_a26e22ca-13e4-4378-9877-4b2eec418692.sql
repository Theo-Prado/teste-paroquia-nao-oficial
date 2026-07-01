
-- 1) Albums & videos: drop the always-true authenticated read policy.
-- Public-role policies (alb_read_pub / vid_read_pub) already cover published rows
-- for both anon and authenticated; staff still have ALL via *_write_staff.
DROP POLICY IF EXISTS albuns_read_public ON public.albuns;
DROP POLICY IF EXISTS videos_read_public ON public.videos;

-- 2) Comentarios: hide email column from anonymous readers.
REVOKE SELECT (email) ON public.comentarios FROM anon;

-- 3) Configuracoes: hide email column from anonymous readers.
REVOKE SELECT (email) ON public.configuracoes FROM anon;

-- 4) form-uploads bucket: restrict inserts to staff only (no anon uploads).
DROP POLICY IF EXISTS form_uploads_public_insert ON storage.objects;
CREATE POLICY form_uploads_staff_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'form-uploads' AND private.is_staff(auth.uid()));

-- 5) media bucket: drop the broad SELECT policy that allows listing.
-- The bucket is public, so direct object URLs continue to work without RLS.
DROP POLICY IF EXISTS media_public_read ON storage.objects;
