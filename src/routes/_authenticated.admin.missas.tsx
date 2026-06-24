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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/missas")({
  component: MissasAdmin,
});

type Form = {
  id?: string;
  titulo: string;
  tipo: string;
  dia_semana: string;
  data_especial: string;
  horario: string;
  local: string;
  descricao: string;
  ativo: boolean;
};
const blank: Form = { titulo: "", tipo: "missa", dia_semana: "", data_especial: "", horario: "08:00", local: "", descricao: "", ativo: true };

function MissasAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);

  const { data: missas } = useQuery({
    queryKey: ["admin-missas"],
    queryFn: async () => (await supabase.from("missas").select("*").order("tipo").order("dia_semana").order("horario")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.titulo || !form.horario) throw new Error("Título e horário obrigatórios.");
      const payload = {
        titulo: form.titulo, tipo: form.tipo,
        dia_semana: form.dia_semana === "" ? null : Number(form.dia_semana),
        data_especial: form.data_especial || null,
        horario: form.horario, local: form.local || null,
        descricao: form.descricao || null, ativo: form.ativo,
      };
      if (form.id) { const { error } = await supabase.from("missas").update(payload).eq("id", form.id); if (error) throw error; }
      else { const { error } = await supabase.from("missas").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Salvo."); setOpen(false); setForm(blank); qc.invalidateQueries({ queryKey: ["admin-missas"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("missas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-missas"] }); },
  });

  return (
    <AdminLayout title="Missas & Horários">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setForm(blank); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Novo horário</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Título</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Quando</th><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Ativo</th><th className="px-4 py-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(missas ?? []).map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{m.titulo}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{m.tipo}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.dia_semana !== null ? WEEKDAYS[m.dia_semana] : m.data_especial}</td>
                <td className="px-4 py-3 font-mono">{m.horario.slice(0, 5)}</td>
                <td className="px-4 py-3">{m.ativo ? "Sim" : "Não"}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setForm({ id: m.id, titulo: m.titulo, tipo: m.tipo, dia_semana: m.dia_semana?.toString() ?? "", data_especial: m.data_especial ?? "", horario: m.horario, local: m.local ?? "", descricao: m.descricao ?? "", ativo: m.ativo }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) del.mutate(m.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {missas?.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhum horário cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} horário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Missa dominical" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="missa">Missa</option>
                  <option value="confissao">Confissão</option>
                  <option value="adoracao">Adoração</option>
                  <option value="novena">Novena</option>
                  <option value="especial">Especial / Solenidade</option>
                </select>
              </div>
              <div>
                <Label>Horário *</Label>
                <Input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Dia da semana</Label>
                <select value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value, data_especial: e.target.value ? "" : form.data_especial })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">— Data específica —</option>
                  {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                </select>
              </div>
              <div>
                <Label>Ou data específica</Label>
                <Input type="date" value={form.data_especial} disabled={form.dia_semana !== ""} onChange={(e) => setForm({ ...form, data_especial: e.target.value })} />
              </div>
            </div>
            <div><Label>Local</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
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
