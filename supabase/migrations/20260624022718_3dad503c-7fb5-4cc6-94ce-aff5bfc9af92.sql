
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin','editor','moderador');
CREATE TYPE public.post_status AS ENUM ('rascunho','publicado','agendado');
CREATE TYPE public.comment_status AS ENUM ('pendente','aprovado','rejeitado');

-- ============= updated_at helper =============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  foto TEXT,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Auto profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= CATEGORIAS =============
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categorias TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_read_all" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "cat_admin_write" ON public.categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'));

-- ============= TAGS =============
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_read_all" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags_write_staff" ON public.tags FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= POSTAGENS =============
CREATE TABLE public.postagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  resumo TEXT,
  conteudo TEXT NOT NULL DEFAULT '',
  imagem TEXT,
  autor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  status public.post_status NOT NULL DEFAULT 'rascunho',
  destaque BOOLEAN NOT NULL DEFAULT false,
  fixado BOOLEAN NOT NULL DEFAULT false,
  agendamento TIMESTAMPTZ,
  publicado_em TIMESTAMPTZ,
  views INT NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX postagens_status_idx ON public.postagens(status, publicado_em DESC);
CREATE INDEX postagens_slug_idx ON public.postagens(slug);
GRANT SELECT ON public.postagens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.postagens TO authenticated;
GRANT ALL ON public.postagens TO service_role;
ALTER TABLE public.postagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_read_published" ON public.postagens FOR SELECT
  USING (status = 'publicado' AND (publicado_em IS NULL OR publicado_em <= now()));
CREATE POLICY "post_read_staff" ON public.postagens FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "post_write_staff" ON public.postagens FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER postagens_updated BEFORE UPDATE ON public.postagens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- post_tags join
CREATE TABLE public.post_tags (
  post_id UUID NOT NULL REFERENCES public.postagens(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
GRANT SELECT ON public.post_tags TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_tags TO authenticated;
GRANT ALL ON public.post_tags TO service_role;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_read_all" ON public.post_tags FOR SELECT USING (true);
CREATE POLICY "pt_write_staff" ON public.post_tags FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= COMENTARIOS =============
CREATE TABLE public.comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postagem_id UUID NOT NULL REFERENCES public.postagens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  status public.comment_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comentarios TO anon, authenticated;
GRANT INSERT ON public.comentarios TO anon, authenticated;
GRANT UPDATE, DELETE ON public.comentarios TO authenticated;
GRANT ALL ON public.comentarios TO service_role;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com_read_approved" ON public.comentarios FOR SELECT USING (status = 'aprovado');
CREATE POLICY "com_read_staff" ON public.comentarios FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "com_insert_anyone" ON public.comentarios FOR INSERT WITH CHECK (status = 'pendente');
CREATE POLICY "com_moderate_staff" ON public.comentarios FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "com_delete_staff" ON public.comentarios FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ============= EVENTOS =============
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  local TEXT,
  imagem TEXT,
  categoria TEXT,
  destaque BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eventos_inicio_idx ON public.eventos(data_inicio);
GRANT SELECT ON public.eventos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ev_read_all" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "ev_write_staff" ON public.eventos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER eventos_updated BEFORE UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= MISSAS / HORARIOS =============
CREATE TABLE public.missas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'missa', -- missa, confissao, adoracao, novena, especial
  dia_semana SMALLINT, -- 0..6 ou null para datas pontuais
  data_especial DATE,
  horario TIME NOT NULL,
  local TEXT,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.missas TO authenticated;
GRANT ALL ON public.missas TO service_role;
ALTER TABLE public.missas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missa_read_all" ON public.missas FOR SELECT USING (true);
CREATE POLICY "missa_write_staff" ON public.missas FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER missas_updated BEFORE UPDATE ON public.missas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= GALERIA: albuns + fotos + videos =============
CREATE TABLE public.albuns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  capa TEXT,
  categoria TEXT,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.albuns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.albuns TO authenticated;
GRANT ALL ON public.albuns TO service_role;
ALTER TABLE public.albuns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alb_read_pub" ON public.albuns FOR SELECT USING (publicado = true);
CREATE POLICY "alb_staff_full" ON public.albuns FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER albuns_updated BEFORE UPDATE ON public.albuns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES public.albuns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  legenda TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fotos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fotos TO authenticated;
GRANT ALL ON public.fotos TO service_role;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fotos_read_all" ON public.fotos FOR SELECT USING (true);
CREATE POLICY "fotos_write_staff" ON public.fotos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT,
  descricao TEXT,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vid_read_pub" ON public.videos FOR SELECT USING (publicado = true);
CREATE POLICY "vid_write_staff" ON public.videos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= ARQUIVOS (media library) =============
CREATE TABLE public.arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  arquivo TEXT NOT NULL,
  tipo TEXT,
  tamanho INT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.arquivos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.arquivos TO authenticated;
GRANT ALL ON public.arquivos TO service_role;
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arq_staff" ON public.arquivos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============= NEWSLETTER =============
CREATE TABLE public.newsletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  confirmado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.newsletter TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.newsletter TO authenticated;
GRANT ALL ON public.newsletter TO service_role;
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_insert_anyone" ON public.newsletter FOR INSERT WITH CHECK (true);
CREATE POLICY "nl_read_staff" ON public.newsletter FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "nl_delete_staff" ON public.newsletter FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ============= MENSAGENS CONTATO =============
CREATE TABLE public.contato_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  assunto TEXT,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contato_mensagens TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contato_mensagens TO authenticated;
GRANT ALL ON public.contato_mensagens TO service_role;
ALTER TABLE public.contato_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_insert_anyone" ON public.contato_mensagens FOR INSERT WITH CHECK (true);
CREATE POLICY "msg_read_staff" ON public.contato_mensagens FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "msg_update_staff" ON public.contato_mensagens FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "msg_delete_staff" ON public.contato_mensagens FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ============= CONFIGURAÇÕES (singleton) =============
CREATE TABLE public.configuracoes (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_paroquia TEXT NOT NULL DEFAULT 'Paróquia Carlo Acutis Lençóis Paulista',
  nome_site TEXT NOT NULL DEFAULT 'Paróquia Carlo Acutis Lençóis Paulista - Site Não Oficial / Teste',
  subtitulo TEXT DEFAULT 'Comunidade de fé, esperança e caridade',
  slogan TEXT DEFAULT 'Tudo para Jesus, por Maria',
  logo TEXT,
  logo_dark TEXT,
  favicon TEXT,
  banner_principal TEXT,
  banner_titulo TEXT DEFAULT 'Bem-vindo à Paróquia Carlo Acutis',
  banner_subtitulo TEXT DEFAULT 'Um lugar de encontro com Deus e com a comunidade',
  telefone TEXT DEFAULT '(14) 3000-0000',
  whatsapp TEXT DEFAULT '5514900000000',
  email TEXT DEFAULT 'contato@paroquiacarloacutis.org',
  endereco TEXT DEFAULT 'Rua da Igreja, 100 — Lençóis Paulista/SP',
  horarios_atendimento TEXT DEFAULT 'Segunda a Sexta, das 8h às 17h',
  facebook TEXT,
  instagram TEXT,
  youtube TEXT,
  site_externo TEXT,
  texto_institucional TEXT DEFAULT 'Esta é uma paróquia fictícia criada para fins de demonstração do CMS.',
  rodape TEXT DEFAULT '© Paróquia Carlo Acutis (fictícia) — Site de demonstração',
  cor_primaria TEXT DEFAULT '#7c1d1d',
  cor_secundaria TEXT DEFAULT '#c9a14a',
  meta_title TEXT DEFAULT 'Paróquia Carlo Acutis Lençóis Paulista',
  meta_description TEXT DEFAULT 'Portal institucional da Paróquia Carlo Acutis em Lençóis Paulista. Notícias, agenda, horários de missas e mais.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracoes TO anon, authenticated;
GRANT UPDATE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfg_read_all" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "cfg_update_admin" ON public.configuracoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER cfg_updated BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.configuracoes (id) VALUES (1);

-- ============= LOGS =============
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX logs_created_idx ON public.logs(created_at DESC);
GRANT SELECT ON public.logs TO authenticated;
GRANT INSERT ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_read_admin" ON public.logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "logs_insert_auth" ON public.logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============= VISITAS (analytics simples) =============
CREATE TABLE public.visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX visitas_created_idx ON public.visitas(created_at DESC);
GRANT INSERT ON public.visitas TO anon, authenticated;
GRANT SELECT ON public.visitas TO authenticated;
GRANT ALL ON public.visitas TO service_role;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_insert_any" ON public.visitas FOR INSERT WITH CHECK (true);
CREATE POLICY "visit_read_staff" ON public.visitas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
