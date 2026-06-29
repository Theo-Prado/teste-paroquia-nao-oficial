-- Allow public to INSERT submissions and answers for published, open forms.
-- (SELECT remains staff-only per existing policies.)

DROP POLICY IF EXISTS form_submissions_public_insert ON public.form_submissions;
CREATE POLICY form_submissions_public_insert ON public.form_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_submissions.form_id
        AND f.status = 'publicado'
        AND f.accept_submissions = true
        AND f.active = true
        AND (f.start_at IS NULL OR now() >= f.start_at)
        AND (f.end_at IS NULL OR now() <= f.end_at)
    )
  );

DROP POLICY IF EXISTS form_answers_public_insert ON public.form_answers;
CREATE POLICY form_answers_public_insert ON public.form_answers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_submissions s
      JOIN public.forms f ON f.id = s.form_id
      WHERE s.id = form_answers.submission_id
        AND f.status = 'publicado'
    )
  );

GRANT INSERT ON public.form_submissions TO anon, authenticated;
GRANT INSERT ON public.form_answers TO anon, authenticated;
