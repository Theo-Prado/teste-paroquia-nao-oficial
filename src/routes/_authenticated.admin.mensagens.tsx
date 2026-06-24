import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/mensagens")({
  component: MensagensAdmin,
});

function MensagensAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-msgs"],
    queryFn: async () => (await supabase.from("contato_mensagens").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const toggle = useMutation({
    mutationFn: async ({ id, lida }: { id: string; lida: boolean }) => { const { error } = await supabase.from("contato_mensagens").update({ lida }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-msgs"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contato_mensagens").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-msgs"] }); },
  });

  return (
    <AdminLayout title="Mensagens de contato">
      <div className="space-y-3">
        {(data ?? []).map((m) => (
          <div key={m.id} className={`rounded-lg border bg-card p-4 ${m.lida ? "border-border" : "border-primary/40 bg-primary/5"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">&lt;{m.email}&gt;</p>
                  {!m.lida && <Badge>Nova</Badge>}
                </div>
                {m.assunto && <p className="mt-1 text-sm font-medium">{m.assunto}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.created_at)}</p>
                <p className="mt-3 text-sm whitespace-pre-wrap">{m.mensagem}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" title={m.lida ? "Marcar como nova" : "Marcar como lida"} onClick={() => toggle.mutate({ id: m.id, lida: !m.lida })}>
                  {m.lida ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(m.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {data?.length === 0 && <p className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">Nenhuma mensagem.</p>}
      </div>
    </AdminLayout>
  );
}
