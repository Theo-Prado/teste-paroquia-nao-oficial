import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, publicMediaUrl } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda paroquial — Paróquia Carlo Acutis" },
      { name: "description", content: "Eventos, encontros e celebrações da paróquia." },
      { property: "og:url", content: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/agenda" },
    ],
    links: [{ rel: "canonical", href: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/agenda" }],
  }),
  component: Agenda,
});

function Agenda() {
  const { data: futuros } = useQuery({
    queryKey: ["agenda", "futuros"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: true });
      return data ?? [];
    },
  });
  const { data: passados } = useQuery({
    queryKey: ["agenda", "passados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .lt("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Agenda paroquial</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Próximos eventos</h1>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {futuros && futuros.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {futuros.map((e) => (
              <article key={e.id} className="overflow-hidden rounded-lg border border-border bg-card">
                {e.imagem && <img src={publicMediaUrl(e.imagem)} alt={e.titulo} className="aspect-[16/9] w-full object-cover" />}
                <div className="p-5">
                  {e.categoria && <p className="text-xs font-semibold uppercase tracking-wider text-gold">{e.categoria}</p>}
                  <h3 className="mt-1 font-display text-xl font-semibold">{e.titulo}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDateTime(e.data_inicio)}</span>
                    {e.local && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.local}</span>}
                  </div>
                  {e.descricao && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{e.descricao}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">Nenhum evento próximo.</p>
        )}

        {passados && passados.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-semibold">Eventos passados</h2>
            <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
              {passados.map((e) => (
                <li key={e.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(e.data_inicio)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
