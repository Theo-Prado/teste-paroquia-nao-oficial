import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/comentarios")({
  component: ComentariosAdmin,
});

function ComentariosAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-comentarios"],
    queryFn: async () => (await supabase.from("comentarios").select("*, postagens(titulo, slug)").order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprovado" | "rejeitado" | "pendente" }) => {
      const { error } = await supabase.from("comentarios").update({ status }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-comentarios"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("comentarios").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-comentarios"] }); },
  });

  return (
    <AdminLayout title="Comentários">
      <div className="space-y-3">
        {(data ?? []).map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">&lt;{c.email}&gt;</p>
                  <Badge variant={c.status === "aprovado" ? "default" : c.status === "rejeitado" ? "destructive" : "secondary"}>{c.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">em "{c.postagens?.titulo}" · {formatDateTime(c.created_at)}</p>
                <p className="mt-3 text-sm whitespace-pre-wrap">{c.conteudo}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" title="Aprovar" onClick={() => setStatus.mutate({ id: c.id, status: "aprovado" })}><Check className="h-4 w-4 text-green-600" /></Button>
                <Button variant="ghost" size="icon" title="Rejeitar" onClick={() => setStatus.mutate({ id: c.id, status: "rejeitado" })}><X className="h-4 w-4 text-destructive" /></Button>
                <Button variant="ghost" size="icon" title="Excluir" onClick={() => { if (confirm("Excluir?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {data?.length === 0 && <p className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">Nenhum comentário.</p>}
      </div>
    </AdminLayout>
  );
}
