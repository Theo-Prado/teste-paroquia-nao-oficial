import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, publicMediaUrl } from "@/lib/utils";

export const Route = createFileRoute("/noticias/")({
  head: () => ({
    meta: [
      { title: "Notícias — Paróquia Carlo Acutis" },
      { name: "description", content: "Últimas notícias e comunicados da paróquia." },
      { property: "og:url", content: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/noticias" },
    ],
    links: [{ rel: "canonical", href: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/noticias" }],
  }),
  component: NoticiasList,
});

function NoticiasList() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categorias").select("*").order("nome")).data ?? [],
  });

  const { data: posts } = useQuery({
    queryKey: ["noticias", q, cat],
    queryFn: async () => {
      let query = supabase
        .from("postagens")
        .select("id, titulo, slug, resumo, imagem, publicado_em, categorias(nome,slug)")
        .eq("status", "publicado")
        .order("publicado_em", { ascending: false });
      if (q.trim()) query = query.ilike("titulo", `%${q.trim()}%`);
      if (cat) query = query.eq("categoria_id", cat);
      const { data } = await query;
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Comunicação</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Notícias</h1>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar notícias..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todas as categorias</option>
            {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {posts && posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} to="/noticias/$slug" params={{ slug: p.slug }} className="group">
                <article className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md h-full flex flex-col">
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {p.imagem ? (
                      <img src={publicMediaUrl(p.imagem)} alt={p.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : null}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    {p.categorias && <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{p.categorias.nome}</p>}
                    <h3 className="mt-1 font-display text-lg font-semibold leading-snug group-hover:text-primary">{p.titulo}</h3>
                    {p.resumo && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.resumo}</p>}
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">{p.publicado_em ? formatDate(p.publicado_em) : ""}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">Nenhuma notícia encontrada.</p>
        )}
      </section>
    </SiteLayout>
  );
}
