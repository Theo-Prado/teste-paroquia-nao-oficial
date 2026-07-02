import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { publicMediaUrl } from "@/lib/utils";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: "Galeria — Paróquia Carlo Acutis" },
      { name: "description", content: "Fotos e vídeos da vida paroquial." },
      { property: "og:url", content: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/galeria" },
    ],
    links: [{ rel: "canonical", href: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/galeria" }],
  }),
  component: Galeria,
});

function Galeria() {
  const { data: albuns } = useQuery({
    queryKey: ["albuns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("albuns")
        .select("*, fotos(id,url)")
        .eq("publicado", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data } = await supabase.from("videos").select("*").eq("publicado", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Galeria</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Fotos & vídeos</h1>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold">Álbuns</h2>
        {albuns && albuns.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albuns.map((a) => (
              <Link key={a.id} to="/galeria" className="group overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {a.capa ? (
                    <img src={publicMediaUrl(a.capa)} alt={a.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : a.fotos?.[0] ? (
                    <img src={publicMediaUrl(a.fotos[0].url)} alt={a.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-semibold">{a.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{a.fotos?.length ?? 0} fotos</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">Sem álbuns publicados.</p>
        )}

        {videos && videos.length > 0 && (
          <>
            <h2 className="mt-16 font-display text-2xl font-semibold">Vídeos</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-border bg-card">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {v.thumbnail && <img src={publicMediaUrl(v.thumbnail)} alt={v.titulo} className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-base font-semibold">{v.titulo}</h3>
                    {v.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{v.descricao}</p>}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
