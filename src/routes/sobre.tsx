import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { useConfig } from "@/lib/site-context";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a paróquia — Paróquia Carlo Acutis" },
      { name: "description", content: "História, missão, visão, valores e equipe pastoral." },
      { property: "og:title", content: "Sobre a paróquia" },
      { property: "og:url", content: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/sobre" },
    ],
    links: [{ rel: "canonical", href: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/sobre" }],
  }),
  component: Sobre,
});

function Sobre() {
  const cfg = useConfig();
  return (
    <SiteLayout>
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">A Paróquia</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Sobre {cfg?.nome_paroquia}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{cfg?.subtitulo}</p>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 prose-paroquia">
        <h2>Nossa história</h2>
        <p>{cfg?.texto_institucional}</p>

        <h2>Missão</h2>
        <p>
          Evangelizar e servir nossa comunidade através da palavra, dos sacramentos e do testemunho de caridade,
          inspirados pela vida do Bem-aventurado Carlo Acutis.
        </p>

        <h2>Visão</h2>
        <p>
          Ser uma paróquia acolhedora, viva e missionária, formada por discípulos de Cristo comprometidos com o
          Reino de Deus na cidade de Lençóis Paulista.
        </p>

        <h2>Valores</h2>
        <ul>
          <li>Fé vivida e celebrada</li>
          <li>Comunhão e fraternidade</li>
          <li>Serviço e caridade</li>
          <li>Formação e evangelização</li>
          <li>Família, vocações e juventude</li>
        </ul>

        <h2>Equipe pastoral</h2>
        <p>
          Nossa comunidade conta com sacerdotes, diáconos, religiosos(as) e leigos engajados em diversas pastorais e
          movimentos. Você pode entrar em contato pelos canais da paróquia.
        </p>
      </article>
    </SiteLayout>
  );
}
