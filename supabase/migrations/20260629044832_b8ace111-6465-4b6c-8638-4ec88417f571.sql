-- Forms module: dynamic form builder
-- Tables: forms, form_fields, form_submissions, form_answers

-- 1) forms
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  active boolean NOT NULL DEFAULT true,
  success_message text NOT NULL DEFAULT 'Sua resposta foi enviada com sucesso.',
  error_message text NOT NULL DEFAULT 'Ocorreu um erro ao enviar. Tente novamente.',
  accept_submissions boolean NOT NULL DEFAULT true,
  allow_multiple boolean NOT NULL DEFAULT true,
  start_at timestamptz,
  end_at timestamptz,
  submission_limit integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forms_status_active_idx ON public.forms(status, active);

GRANT SELECT ON public.forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT ALL ON public.forms TO service_role;

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY forms_public_read ON public.forms
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND active = true);

CREATE POLICY forms_staff_read_all ON public.forms
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE POLICY forms_staff_insert ON public.forms
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY forms_staff_update ON public.forms
  FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY forms_staff_delete ON public.forms
  FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE TRIGGER forms_set_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) form_fields
CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text NOT NULL,
  label text NOT NULL,
  description text,
  placeholder text,
  required boolean NOT NULL DEFAULT false,
  width text NOT NULL DEFAULT '100' CHECK (width IN ('50','100')),
  order_index integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, name)
);
CREATE INDEX form_fields_form_order_idx ON public.form_fields(form_id, order_index);

GRANT SELECT ON public.form_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_fields TO authenticated;
GRANT ALL ON public.form_fields TO service_role;

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY form_fields_public_read ON public.form_fields
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_fields.form_id AND f.status = 'published' AND f.active = true
  ));

CREATE POLICY form_fields_staff_all ON public.form_fields
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER form_fields_set_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) form_submissions
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX form_submissions_form_created_idx ON public.form_submissions(form_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Submissions are inserted via server (admin client). No direct anon/auth INSERT policy.
CREATE POLICY form_submissions_staff_select ON public.form_submissions
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE POLICY form_submissions_staff_update ON public.form_submissions
  FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY form_submissions_staff_delete ON public.form_submissions
  FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));

-- 4) form_answers
CREATE TABLE public.form_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX form_answers_submission_idx ON public.form_answers(submission_id);

GRANT SELECT, INSERT, DELETE ON public.form_answers TO authenticated;
GRANT ALL ON public.form_answers TO service_role;

ALTER TABLE public.form_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY form_answers_staff_select ON public.form_answers
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE POLICY form_answers_staff_delete ON public.form_answers
  FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));