
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- Drop policies that reference public.has_role / public.is_staff so we can move the functions
DROP POLICY IF EXISTS com_delete_staff ON public.comentarios;
DROP POLICY IF EXISTS com_moderate_staff ON public.comentarios;
DROP POLICY IF EXISTS com_read_staff ON public.comentarios;
DROP POLICY IF EXISTS com_read_approved ON public.comentarios;
DROP POLICY IF EXISTS com_insert_anyone ON public.comentarios;
DROP POLICY IF EXISTS logs_insert_auth ON public.logs;
DROP POLICY IF EXISTS logs_read_admin ON public.logs;
DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
DROP POLICY IF EXISTS visit_insert_any ON public.visitas;
DROP POLICY IF EXISTS visit_read_staff ON public.visitas;
DROP POLICY IF EXISTS roles_select_self_or_admin ON public.user_roles;

-- Drop policies on any other tables referencing these helpers
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND (qual ILIKE '%has_role(%' OR qual ILIKE '%is_staff(%'
        OR with_check ILIKE '%has_role(%' OR with_check ILIKE '%is_staff(%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Move helper functions to private schema
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_staff(uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO anon, authenticated, service_role;

-- Lock down trigger helper too (only the auth trigger needs it)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Recreate broad policies covering anything that was dropped above
CREATE POLICY albuns_read_public ON public.albuns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY albuns_write_staff ON public.albuns FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY categorias_read_public ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categorias_write_staff ON public.categorias FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY eventos_read_public ON public.eventos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY eventos_write_staff ON public.eventos FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY fotos_read_public ON public.fotos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY fotos_write_staff ON public.fotos FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY missas_read_public ON public.missas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY missas_write_staff ON public.missas FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY tags_read_public ON public.tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tags_write_staff ON public.tags FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY post_tags_read_public ON public.post_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY post_tags_write_staff ON public.post_tags FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY videos_read_public ON public.videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY videos_write_staff ON public.videos FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY arquivos_all_staff ON public.arquivos FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY config_read_public ON public.configuracoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY config_write_admin ON public.configuracoes FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY msg_insert_any ON public.contato_mensagens FOR INSERT TO anon, authenticated WITH CHECK (length(nome) BETWEEN 1 AND 200 AND length(mensagem) BETWEEN 1 AND 5000);
CREATE POLICY msg_read_staff ON public.contato_mensagens FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY msg_update_staff ON public.contato_mensagens FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY msg_delete_staff ON public.contato_mensagens FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));

CREATE POLICY news_insert_any ON public.newsletter FOR INSERT TO anon, authenticated WITH CHECK (length(email) BETWEEN 3 AND 320);
CREATE POLICY news_read_staff ON public.newsletter FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY news_delete_staff ON public.newsletter FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));

CREATE POLICY posts_read_public ON public.postagens FOR SELECT TO anon, authenticated USING (status = 'publicado'::post_status OR private.is_staff(auth.uid()));
CREATE POLICY posts_write_staff ON public.postagens FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- user_roles: self or admin
CREATE POLICY roles_select_self_or_admin ON public.user_roles FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY roles_admin_write ON public.user_roles FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Comentarios: hide email column from anonymous readers, scope public read to anon role
REVOKE SELECT (email) ON public.comentarios FROM anon;

CREATE POLICY com_read_approved ON public.comentarios FOR SELECT TO anon
USING (status = 'aprovado'::comment_status);

CREATE POLICY com_read_staff ON public.comentarios FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

CREATE POLICY com_insert_anyone ON public.comentarios FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pendente'::comment_status
  AND length(nome) BETWEEN 1 AND 200
  AND length(email) BETWEEN 3 AND 320
  AND length(conteudo) BETWEEN 1 AND 5000
);

CREATE POLICY com_moderate_staff ON public.comentarios FOR UPDATE TO authenticated
USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY com_delete_staff ON public.comentarios FOR DELETE TO authenticated
USING (private.is_staff(auth.uid()));

-- Logs: insert is restricted to entries attributed to the calling user
CREATE POLICY logs_insert_auth ON public.logs FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY logs_read_admin ON public.logs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Profiles: only own or staff
CREATE POLICY profiles_select_own_or_staff ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR private.is_staff(auth.uid()));

-- Visitas: constrain inserts
CREATE POLICY visit_insert_any ON public.visitas FOR INSERT TO anon, authenticated
WITH CHECK (
  (path IS NULL OR length(path) <= 2048)
  AND (referrer IS NULL OR length(referrer) <= 2048)
  AND (user_agent IS NULL OR length(user_agent) <= 1024)
);

CREATE POLICY visit_read_staff ON public.visitas FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));
