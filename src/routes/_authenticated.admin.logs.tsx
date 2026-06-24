import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { useAuth, hasRole } from "@/lib/site-context";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: LogsAdmin,
});

function LogsAdmin() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => (await supabase.from("logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  if (!hasRole(user, "admin")) return <AdminLayout title="Logs"><p>Apenas administradores.</p></AdminLayout>;
  return (
    <AdminLayout title="Logs de auditoria">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Entidade</th></tr></thead>
          <tbody className="divide-y divide-border">
            {(data ?? []).map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-muted-foreground">{formatDateTime(l.created_at)}</td>
                <td className="px-4 py-2">{l.usuario_nome ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.acao}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.entidade}</td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Sem logs.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
