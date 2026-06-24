import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePicker } from "@/components/image-picker";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, makeSlug } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/eventos")({
  component: EventosAdmin,
});

type Form = {
  id?: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  categoria: string;
  imagem: string | null;
};
const blank: Form = { titulo: "", descricao: "", data_inicio: "", data_fim: "", local: "", categoria: "", imagem: null };

function EventosAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);

  const { data: eventos } = useQuery({
    queryKey: ["admin-eventos"],
    queryFn: async () => (await supabase.from("eventos").select("*").order("data_inicio", { ascending: false })).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.titulo || !form.data_inicio) throw new Error("Título e data são obrigatórios.");
      const payload = {
        titulo: form.titulo, slug: makeSlug(form.titulo) + "-" + Date.now().toString(36),
        descricao: form.descricao || null,
        data_inicio: new Date(form.data_inicio).toISOString(),
        data_fim: form.data_fim ? new Date(form.data_fim).toISOString() : null,
        local: form.local || null, categoria: form.categoria || null, imagem: form.imagem,
      };
      if (form.id) {
        const { error } = await supabase.from("eventos").update({ ...payload, slug: undefined }).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("eventos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo."); setOpen(false); setForm(blank); qc.invalidateQueries({ queryKey: ["admin-eventos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("eventos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-eventos"] }); },
  });

  const edit = (e: typeof eventos extends Array<infer T> ? T : never) => {
    setForm({
      id: e.id, titulo: e.titulo, descricao: e.descricao ?? "",
      data_inicio: e.data_inicio.slice(0, 16), data_fim: e.data_fim?.slice(0, 16) ?? "",
      local: e.local ?? "", categoria: e.categoria ?? "", imagem: e.imagem,
    });
    setOpen(true);
  };

  return (
    <AdminLayout title="Eventos">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setForm(blank); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Novo evento</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-left text-muted-foreground">
            <tr><th className="px-4 py-3">Título</th><th className="px-4 py-3">Quando</th><th className="px-4 py-3">Local</th><th className="px-4 py-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(eventos ?? []).map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{e.titulo}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(e.data_inicio)}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.local}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => edit(e)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {eventos?.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nenhum evento.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Início *</Label><Input type="datetime-local" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="datetime-local" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Local</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Solenidade, Festa, Retiro" /></div>
            </div>
            <div><Label>Descrição</Label><Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label>Imagem</Label><ImagePicker value={form.imagem} onChange={(p) => setForm({ ...form, imagem: p })} folder="eventos" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
