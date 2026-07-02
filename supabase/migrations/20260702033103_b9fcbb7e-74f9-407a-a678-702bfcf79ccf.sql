-- Restrict anonymous read on comentarios to safe columns only, hiding submitter email
REVOKE SELECT ON public.comentarios FROM anon;
GRANT SELECT (id, nome, conteudo, created_at, postagem_id, status) ON public.comentarios TO anon;
-- Ensure INSERT (needed by com_insert_anyone policy) is preserved for anon on submission columns
GRANT INSERT (nome, email, conteudo, postagem_id) ON public.comentarios TO anon;