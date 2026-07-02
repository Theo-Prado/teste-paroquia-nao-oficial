import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/missas")({
  head: () => ({
    meta: [
      { title: "Missas e horários — Paróquia Carlo Acutis" },
      { name: "description", content: "Horários semanais e especiais de missas, confissões, adorações e novenas." },
      { property: "og:url", content: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/missas" },
    ],
    links: [{ rel: "canonical", href: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/missas" }],
  }),
  component: Missas,
});

const TIPOS = [
  { key: "missa", label: "Missas" },
  { key: "confissao", label: "Confissões" },
  { key: "adoracao", label: "Adoração" },
  { key: "novena", label: "Novenas" },
  { key: "especial", label: "Especiais & Solenidades" },
] as const;

function Missas() {
  const { data: missas } = useQuery({
    queryKey: ["missas-all"],
    queryFn: async () => {
      const { data } = await supabase.from("missas").select("*").eq("ativo", true).order("dia_semana").order("horario");
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Vida sacramental</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Missas & horários</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12 sm:px-6 lg:px-8">
        {TIPOS.map((t) => {
          const items = (missas ?? []).filter((m) => m.tipo === t.key);
          if (items.length === 0) return null;
          return (
            <section key={t.key}>
              <h2 className="font-display text-2xl font-semibold border-b border-border pb-2">{t.label}</h2>
              <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
                {items.map((m) => (
                  <li key={m.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.dia_semana !== null ? WEEKDAYS[m.dia_semana] : m.data_especial ? formatDate(m.data_especial) : ""}
                        {m.local ? ` · ${m.local}` : ""}
                      </p>
                      {m.descricao && <p className="mt-1 text-sm text-muted-foreground">{m.descricao}</p>}
                    </div>
                    <div className="font-display text-2xl font-semibold text-primary">{m.horario.slice(0, 5)}</div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {(missas?.length ?? 0) === 0 && (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Os horários ainda não foram cadastrados.
          </p>
        )}
      </div>
    </SiteLayout>
  );
}
