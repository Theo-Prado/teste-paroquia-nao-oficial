import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: NewsletterAdmin,
});

function NewsletterAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-newsletter"],
    queryFn: async () => (await supabase.from("newsletter").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("newsletter").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido."); qc.invalidateQueries({ queryKey: ["admin-newsletter"] }); },
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [["nome", "email", "data"], ...data.map((r) => [r.nome ?? "", r.email, r.created_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Newsletter">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} inscritos</p>
        <Button onClick={exportCsv} variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Inscrito em</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-border">
            {(data ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Sem inscritos.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
