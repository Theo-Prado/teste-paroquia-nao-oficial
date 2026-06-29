-- RLS for form-uploads bucket on storage.objects
CREATE POLICY form_uploads_public_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'form-uploads');

CREATE POLICY form_uploads_staff_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'form-uploads' AND private.is_staff(auth.uid()));

CREATE POLICY form_uploads_staff_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'form-uploads' AND private.is_staff(auth.uid()));