import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "@/lib/site-context";
import { cn, formatDate, publicMediaUrl, WEEKDAYS } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paróquia Carlo Acutis Lençóis Paulista" },
      { name: "description", content: "Notícias, agenda, missas e vida pastoral da Paróquia Carlo Acutis em Lençóis Paulista." },
      { property: "og:title", content: "Paróquia Carlo Acutis Lençóis Paulista" },
      { property: "og:description", content: "Notícias, agenda, missas e vida pastoral." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const cfg = useConfig();

  const { data: featured } = useQuery({
    queryKey: ["home", "featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("postagens")
        .select("id, titulo, slug, resumo, imagem, publicado_em")
        .eq("status", "publicado")
        .eq("destaque", true)
        .order("publicado_em", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["home", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("postagens")
        .select("id, titulo, slug, resumo, imagem, publicado_em, categorias(nome,slug)")
        .eq("status", "publicado")
        .order("publicado_em", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: eventos } = useQuery({
    queryKey: ["home", "eventos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("id, titulo, slug, descricao, data_inicio, local, imagem")
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: true })
        .limit(4);
      return data ?? [];
    },
  });

  const { data: missas } = useQuery({
    queryKey: ["home", "missas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("missas")
        .select("*")
        .eq("ativo", true)
        .eq("tipo", "missa")
        .order("dia_semana", { ascending: true })
        .order("horario", { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-sidebar text-sidebar-foreground">
        {cfg?.banner_principal && (
          <div className="absolute inset-0">
            <img src={publicMediaUrl(cfg.banner_principal)} alt="" className="h-full w-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/80 to-sidebar/40" />
          </div>
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {cfg?.subtitulo}
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {cfg?.banner_titulo}
            </h1>
            <p className="mt-5 max-w-xl text-base text-sidebar-foreground/80 sm:text-lg">
              {cfg?.banner_subtitulo}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                <Link to="/noticias">Ver notícias <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-sidebar-foreground/30 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent">
                <Link to="/missas">Horários de missa</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured && featured.length > 0 && (
        <Section title="Em destaque" subtitle="O que está movendo a comunidade">
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.id} to="/noticias/$slug" params={{ slug: p.slug }} className="group">
                <article className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg h-full flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {p.imagem ? (
                      <img src={publicMediaUrl(p.imagem)} alt={p.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">Sem imagem</div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-xs uppercase tracking-wider text-gold font-semibold">Destaque</p>
                    <h3 className="mt-2 font-display text-xl font-semibold leading-snug group-hover:text-primary">{p.titulo}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.resumo}</p>
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">{p.publicado_em ? formatDate(p.publicado_em) : ""}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* RECENT */}
      <Section title="Últimas notícias" subtitle="Acompanhe nossa comunidade" action={<Link to="/noticias" className="text-sm font-medium text-primary hover:underline">Ver todas <ArrowRight className="inline h-3 w-3" /></Link>}>
        {recent && recent.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <Link key={p.id} to="/noticias/$slug" params={{ slug: p.slug }} className="group">
                <article className="flex gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.imagem && <img src={publicMediaUrl(p.imagem)} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {p.categorias && <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{p.categorias.nome}</p>}
                    <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold leading-snug group-hover:text-primary">{p.titulo}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{p.publicado_em ? formatDate(p.publicado_em) : ""}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda não há notícias publicadas." />
        )}
      </Section>

      {/* EVENTOS + MISSAS */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle title="Próximos eventos" subtitle="Agenda paroquial" />
            {eventos && eventos.length > 0 ? (
              <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
                {eventos.map((e) => (
                  <li key={e.id} className="flex gap-4 p-5">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <span className="text-[10px] font-semibold uppercase">{new Date(e.data_inicio).toLocaleDateString("pt-BR", { month: "short" })}</span>
                      <span className="font-display text-xl leading-none">{new Date(e.data_inicio).getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display text-lg font-semibold leading-tight">{e.titulo}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(e.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {e.local && <> · {e.local}</>}
                      </p>
                      {e.descricao && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.descricao}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="Nenhum evento próximo." />
            )}
            <div className="mt-4">
              <Link to="/agenda" className="text-sm font-medium text-primary hover:underline">Ver agenda completa <ArrowRight className="inline h-3 w-3" /></Link>
            </div>
          </div>

          <div>
            <SectionTitle title="Horários de missa" subtitle="Venha celebrar conosco" />
            {missas && missas.length > 0 ? (
              <Card className="mt-6 overflow-hidden">
                <ul className="divide-y divide-border">
                  {missas.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-semibold">{m.dia_semana !== null ? WEEKDAYS[m.dia_semana] : formatDate(m.data_especial ?? "")}</p>
                        <p className="text-xs text-muted-foreground">{m.titulo}{m.local ? ` · ${m.local}` : ""}</p>
                      </div>
                      <div className="font-display text-xl font-semibold text-primary">{m.horario.slice(0, 5)}</div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <EmptyState text="Horários ainda não cadastrados." />
            )}
            <div className="mt-4">
              <Link to="/missas" className="text-sm font-medium text-primary hover:underline">Ver todos os horários <ArrowRight className="inline h-3 w-3" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Calendar className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-3 font-display text-3xl font-semibold">Receba nossa newsletter</h2>
          <p className="mt-2 text-muted-foreground">Notícias e novidades direto no seu e-mail.</p>
          <div className="mt-6">
            <Button asChild size="lg"><Link to="/newsletter">Inscrever-se</Link></Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <SectionTitle title={title} subtitle={subtitle} />
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      {subtitle && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{subtitle}</p>}
      <h2 className={cn("font-display text-3xl font-semibold leading-tight sm:text-4xl", subtitle && "mt-1")}>{title}</h2>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">{text}</p>;
}
