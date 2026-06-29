import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { FileText, Calendar, MessageSquare, Mail, Eye, Users, ClipboardList, Reply } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { formsRepository } from "@/lib/forms/repository";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [posts, eventos, com, news, visitas, msgs] = await Promise.all([
        supabase.from("postagens").select("*", { count: "exact", head: true }),
        supabase.from("eventos").select("*", { count: "exact", head: true }),
        supabase.from("comentarios").select("*", { count: "exact", head: true }),
        supabase.from("newsletter").select("*", { count: "exact", head: true }),
        supabase.from("visitas").select("*", { count: "exact", head: true }),
        supabase.from("contato_mensagens").select("*", { count: "exact", head: true }).eq("lida", false),
      ]);
      return {
        posts: posts.count ?? 0,
        eventos: eventos.count ?? 0,
        comentarios: com.count ?? 0,
        newsletter: news.count ?? 0,
        visitas: visitas.count ?? 0,
        mensagens: msgs.count ?? 0,
      };
    },
  });

  const { data: postsMes } = useQuery({
    queryKey: ["posts-mes"],
    queryFn: async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1);
      const { data } = await supabase.from("postagens").select("created_at").gte("created_at", since.toISOString());
      const buckets: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
        buckets[d.toISOString().slice(0, 7)] = 0;
      }
      (data ?? []).forEach((r) => { const k = r.created_at.slice(0, 7); if (k in buckets) buckets[k]++; });
      return Object.entries(buckets).map(([mes, n]) => ({ mes: mes.slice(5) + "/" + mes.slice(2, 4), n }));
    },
  });

  const { data: visitasDia } = useQuery({
    queryKey: ["visitas-dia"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const { data } = await supabase.from("visitas").select("created_at").gte("created_at", since.toISOString());
      const buckets: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      (data ?? []).forEach((r) => { const k = r.created_at.slice(0, 10); if (k in buckets) buckets[k]++; });
      return Object.entries(buckets).map(([d, n]) => ({ d: d.slice(5), n }));
    },
  });

  // Estatísticas do módulo de Formulários (totais agregados pelo repositório).
  const { data: formsStats } = useQuery({
    queryKey: ["forms-dashboard-stats"],
    queryFn: () => formsRepository.stats(),
  });

  const cards = [
    { label: "Postagens", value: stats?.posts ?? 0, icon: FileText, color: "text-primary" },
    { label: "Eventos", value: stats?.eventos ?? 0, icon: Calendar, color: "text-gold" },
    { label: "Comentários", value: stats?.comentarios ?? 0, icon: MessageSquare, color: "text-primary" },
    { label: "Newsletter", value: stats?.newsletter ?? 0, icon: Mail, color: "text-gold" },
    { label: "Visitas", value: stats?.visitas ?? 0, icon: Eye, color: "text-primary" },
    { label: "Mensagens novas", value: stats?.mensagens ?? 0, icon: Users, color: "text-destructive" },
    { label: "Formulários", value: formsStats?.totalForms ?? 0, icon: ClipboardList, color: "text-primary" },
    { label: "Respostas", value: formsStats?.totalSubmissions ?? 0, icon: Reply, color: "text-gold" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold">{c.value}</p>
          </Card>
        ))}
      </div>

      {formsStats && (formsStats.topForm || formsStats.lastSubmissionAt) && (
        <Card className="mt-4 p-5 flex flex-wrap items-center gap-6">
          {formsStats.topForm && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Formulário mais respondido</p>
              <Link to="/admin/formularios/respostas" search={{ form: formsStats.topForm.id }} className="font-medium hover:underline">
                {formsStats.topForm.title} <span className="text-muted-foreground text-sm">({formsStats.topForm.count})</span>
              </Link>
            </div>
          )}
          {formsStats.lastSubmissionAt && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Última resposta</p>
              <p className="font-medium">{new Date(formsStats.lastSubmissionAt).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </Card>
      )}


      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold">Visitas (14 dias)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitasDia ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="d" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="n" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold">Conteúdo publicado por mês</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postsMes ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="n" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
