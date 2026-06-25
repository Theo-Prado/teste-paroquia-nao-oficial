import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { useState } from "react";
import { Calendar, ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate, publicMediaUrl } from "@/lib/utils";

export const Route = createFileRoute("/noticias/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.fetchQuery({
      queryKey: ["post", params.slug],
      queryFn: async () => {
        const { data } = await supabase
          .from("postagens")
          .select("*, profiles(nome), categorias(nome,slug)")
          .eq("slug", params.slug)
          .eq("status", "publicado")
          .maybeSingle();
        return data;
      },
    });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.post.titulo ?? "Notícia"} — Paróquia Carlo Acutis` },
      { name: "description", content: loaderData?.post.meta_description ?? loaderData?.post.resumo ?? "" },
      { property: "og:title", content: loaderData?.post.titulo ?? "" },
      { property: "og:description", content: loaderData?.post.resumo ?? "" },
      { property: "og:image", content: loaderData?.post.imagem ? publicMediaUrl(loaderData.post.imagem) : "" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/noticias/${loaderData?.post.slug}` },
    ],
    links: [{ rel: "canonical", href: `/noticias/${loaderData?.post.slug}` }],
  }),
  errorComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Não foi possível carregar essa notícia</h1>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Notícia não encontrada</h1>
        <Link to="/noticias" className="mt-4 inline-block text-primary hover:underline">Voltar para notícias</Link>
      </div>
    </SiteLayout>
  ),
  component: PostPage,
});

function PostPage() {
  const { post } = Route.useLoaderData();
  const qc = useQueryClient();

  const { data: comentarios } = useQuery({
    queryKey: ["comentarios", post.id],
    queryFn: async () => {
      const { data } = await supabase.from("comentarios").select("id, nome, conteudo, created_at, postagem_id, status").eq("postagem_id", post.id).eq("status", "aprovado").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: relacionadas } = useQuery({
    queryKey: ["post-rel", post.id, post.categoria_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("postagens")
        .select("id, titulo, slug, imagem, publicado_em")
        .eq("status", "publicado")
        .neq("id", post.id)
        .eq("categoria_id", post.categoria_id ?? "")
        .order("publicado_em", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!post.categoria_id,
  });

  const [com, setCom] = useState({ nome: "", email: "", conteudo: "" });
  const addCom = useMutation({
    mutationFn: async () => {
      if (com.nome.length < 2 || !com.email.includes("@") || com.conteudo.length < 5) {
        throw new Error("Preencha todos os campos corretamente.");
      }
      const { error } = await supabase.from("comentarios").insert({
        postagem_id: post.id,
        nome: com.nome.trim().slice(0, 100),
        email: com.email.trim().slice(0, 255),
        conteudo: com.conteudo.trim().slice(0, 1000),
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comentário enviado e aguardando aprovação.");
      setCom({ nome: "", email: "", conteudo: "" });
      qc.invalidateQueries({ queryKey: ["comentarios", post.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: post.titulo, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); toast.success("Link copiado!"); }
    } catch { /* ignore */ }
  };

  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/noticias" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
        {post.categorias && (
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold">{post.categorias.nome}</p>
        )}
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{post.titulo}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {post.publicado_em && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(post.publicado_em)}</span>}
          {post.profiles && <span>Por {post.profiles.nome}</span>}
          <button onClick={share} className="inline-flex items-center gap-1 text-primary hover:underline"><Share2 className="h-3 w-3" /> Compartilhar</button>
        </div>
        {post.imagem && (
          <img src={publicMediaUrl(post.imagem)} alt={post.titulo} className="mt-8 aspect-[16/9] w-full rounded-lg object-cover" />
        )}
        {post.resumo && <p className="mt-6 text-lg leading-relaxed text-muted-foreground italic border-l-2 border-gold pl-4">{post.resumo}</p>}
        <div className="mt-8 prose-paroquia" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.conteudo) }} />
      </article>

      {/* Comments */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold border-b border-border pb-2">Comentários ({comentarios?.length ?? 0})</h2>
        {comentarios && comentarios.length > 0 ? (
          <ul className="mt-6 space-y-5">
            {comentarios.map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold">{c.nome}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(c.created_at)}</p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{c.conteudo}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
        )}

        <form onSubmit={(e) => { e.preventDefault(); addCom.mutate(); }} className="mt-8 space-y-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Deixe seu comentário</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="cnome">Nome</Label><Input id="cnome" required maxLength={100} value={com.nome} onChange={(e) => setCom({ ...com, nome: e.target.value })} /></div>
            <div><Label htmlFor="cmail">E-mail</Label><Input id="cmail" type="email" required maxLength={255} value={com.email} onChange={(e) => setCom({ ...com, email: e.target.value })} /></div>
          </div>
          <div><Label htmlFor="cmsg">Mensagem</Label><Textarea id="cmsg" required rows={4} maxLength={1000} value={com.conteudo} onChange={(e) => setCom({ ...com, conteudo: e.target.value })} /></div>
          <Button type="submit" disabled={addCom.isPending}>{addCom.isPending ? "Enviando..." : "Enviar comentário"}</Button>
          <p className="text-xs text-muted-foreground">Seu comentário passará por moderação antes de ser publicado.</p>
        </form>
      </section>

      {relacionadas && relacionadas.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold">Notícias relacionadas</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {relacionadas.map((r) => (
              <Link key={r.id} to="/noticias/$slug" params={{ slug: r.slug }} className="group block rounded-lg border border-border bg-card overflow-hidden">
                {r.imagem && <img src={publicMediaUrl(r.imagem)} alt={r.titulo} className="aspect-video w-full object-cover" />}
                <div className="p-3">
                  <h3 className="font-display text-sm font-semibold leading-snug group-hover:text-primary line-clamp-2">{r.titulo}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
