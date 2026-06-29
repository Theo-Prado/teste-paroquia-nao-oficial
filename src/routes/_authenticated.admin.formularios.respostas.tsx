/**
 * Painel de Respostas: lista, filtra, visualiza, exporta e exclui.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Eye, Trash2, Download, FileSpreadsheet, FileText as FileTextIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import { isFileField, isLayoutField, type FieldType, type FormFieldRow } from "@/lib/forms/types";

// Schema do search da URL — permite filtrar por formulário diretamente.
const searchSchema = z.object({
  form: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/admin/formularios/respostas")({
  component: SubmissionsPanel,
  validateSearch: searchSchema,
});

type SubmissionRow = {
  id: string;
  form_id: string;
  ip: string | null;
  status: string;
  created_at: string;
  user_agent: string | null;
};

function SubmissionsPanel() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  // Lista dos formulários para o filtro
  const { data: forms } = useQuery({
    queryKey: ["forms-list-min"],
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("id, title, slug").order("title");
      return data ?? [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["form-submissions", search],
    queryFn: async () => {
      let q = supabase.from("form_submissions").select("*").order("created_at", { ascending: false }).limit(500);
      if (search.form) q = q.eq("form_id", search.form);
      if (search.status) q = q.eq("status", search.status);
      if (search.from) q = q.gte("created_at", new Date(search.from).toISOString());
      if (search.to) q = q.lte("created_at", new Date(search.to).toISOString());
      const { data } = await q;
      return (data ?? []) as SubmissionRow[];
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewingId, setViewingId] = useState<string | null>(null);

  const formMap = useMemo(() => Object.fromEntries((forms ?? []).map((f) => [f.id, f])), [forms]);

  // Busca textual feita em memória (entre o campo "q" e dados resumidos)
  const filtered = useMemo(() => {
    if (!search.q) return subs ?? [];
    const q = search.q.toLowerCase();
    return (subs ?? []).filter((s) =>
      (s.ip ?? "").toLowerCase().includes(q) ||
      (formMap[s.form_id]?.title ?? "").toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q),
    );
  }, [subs, search.q, formMap]);

  // ---------- Mutations ----------

  const delMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("form_submissions").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Respostas excluídas.");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });

  // ---------- Exportação ----------

  const exportData = async (format: "csv" | "xlsx" | "pdf") => {
    if (!search.form) { toast.error("Selecione um formulário para exportar."); return; }
    const { data: fields } = await supabase.from("form_fields").select("*").eq("form_id", search.form).order("order_index");
    const visibleFields = (fields ?? []).filter((f) => !isLayoutField(f.type as FieldType));
    const ids = (filtered ?? []).map((s) => s.id);
    if (ids.length === 0) { toast.error("Sem respostas para exportar."); return; }
    const { data: answers } = await supabase.from("form_answers").select("*").in("submission_id", ids);
    const grouped = new Map<string, Record<string, unknown>>();
    (answers ?? []).forEach((a) => {
      const bag = grouped.get(a.submission_id) ?? {};
      bag[a.field_id] = a.value;
      grouped.set(a.submission_id, bag);
    });

    const header = ["ID", "Data", "IP", "Status", ...visibleFields.map((f) => f.label)];
    const rows = filtered.map((s) => {
      const bag = grouped.get(s.id) ?? {};
      return [s.id, formatDate(s.created_at), s.ip ?? "", s.status,
        ...visibleFields.map((f) => stringifyAnswer(bag[f.id], f as FormFieldRow))];
    });

    if (format === "csv") {
      const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "respostas.csv");
    } else if (format === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Respostas");
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(new Blob([out], { type: "application/octet-stream" }), "respostas.xlsx");
    } else {
      // PDF via janela de impressão do navegador (KISS)
      const html = `<!doctype html><meta charset="utf-8"><title>Respostas</title>
        <style>body{font-family:system-ui;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f3f3}</style>
        <h1>Respostas — ${formMap[search.form]?.title ?? ""}</h1>
        <table><thead><tr>${header.map((h) => `<th>${escapeHtml(String(h))}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>
        <script>window.onload=()=>window.print()</script>`;
      const w = window.open("", "_blank");
      if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    }
  };

  // ---------- Render ----------

  return (
    <AdminLayout title="Respostas">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/formularios"><ArrowLeft className="mr-2 h-4 w-4" /> Formulários</Link>
        </Button>
      </div>

      <Card className="p-4 mb-4 grid gap-3 md:grid-cols-5">
        <div>
          <Label>Formulário</Label>
          <Select value={search.form ?? "all"}
            onValueChange={(v) => navigate({ search: (s) => ({ ...s, form: v === "all" ? undefined : v }) })}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(forms ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={search.status ?? "all"}
            onValueChange={(v) => navigate({ search: (s) => ({ ...s, status: v === "all" ? undefined : v }) })}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>De</Label>
          <Input type="date" value={search.from ?? ""} onChange={(e) => navigate({ search: (s) => ({ ...s, from: e.target.value || undefined }) })} />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="date" value={search.to ?? ""} onChange={(e) => navigate({ search: (s) => ({ ...s, to: e.target.value || undefined }) })} />
        </div>
        <div>
          <Label>Busca</Label>
          <Input placeholder="Texto, IP, ID..." value={search.q ?? ""} onChange={(e) => navigate({ search: (s) => ({ ...s, q: e.target.value || undefined }) })} />
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{filtered.length} registro(s)</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData("csv")} disabled={!search.form}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData("xlsx")} disabled={!search.form}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData("pdf")} disabled={!search.form}>
            <FileTextIcon className="mr-2 h-4 w-4" /> PDF
          </Button>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm"
              onClick={() => { if (confirm(`Excluir ${selected.size} resposta(s)?`)) delMany.mutate([...selected]); }}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir selecionadas
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 w-8">
                <input type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((s) => s.id)) : new Set())} />
              </th>
              <th className="px-3 py-3">Formulário</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">IP</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(s.id)}
                    onChange={(e) => {
                      const n = new Set(selected);
                      if (e.target.checked) n.add(s.id); else n.delete(s.id);
                      setSelected(n);
                    }} />
                </td>
                <td className="px-3 py-3">{formMap[s.form_id]?.title ?? s.form_id}</td>
                <td className="px-3 py-3 text-muted-foreground">{formatDate(s.created_at)}</td>
                <td className="px-3 py-3"><Badge variant="outline">{s.status}</Badge></td>
                <td className="px-3 py-3 text-muted-foreground">{s.ip ?? "-"}</td>
                <td className="px-3 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setViewingId(s.id)} aria-label="Ver">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon"
                    onClick={() => { if (confirm("Excluir esta resposta?")) delMany.mutate([s.id]); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma resposta encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ViewSubmissionDialog id={viewingId} onClose={() => setViewingId(null)} />
    </AdminLayout>
  );
}

// ---------- Dialog de visualização ----------

function ViewSubmissionDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["form-submission-view", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data: sub } = await supabase.from("form_submissions").select("*").eq("id", id).single();
      const { data: fields } = await supabase.from("form_fields").select("*").eq("form_id", sub!.form_id).order("order_index");
      const { data: answers } = await supabase.from("form_answers").select("*").eq("submission_id", id);
      const { data: form } = await supabase.from("forms").select("id, title, slug").eq("id", sub!.form_id).single();
      return { sub: sub!, fields: (fields ?? []) as FormFieldRow[], answers: answers ?? [], form: form! };
    },
  });

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{data?.form.title ?? "Resposta"}</DialogTitle></DialogHeader>
        {!data ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Enviada em {formatDate(data.sub.created_at)} · IP {data.sub.ip ?? "—"}
            </div>
            <div className="space-y-3">
              {data.fields
                .filter((f) => !isLayoutField(f.type as FieldType))
                .map((f) => {
                  const a = data.answers.find((x) => x.field_id === f.id);
                  return (
                    <div key={f.id} className="border-b border-border pb-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
                      <AnswerValue field={f} value={a?.value} />
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AnswerValue({ field, value }: { field: FormFieldRow; value: unknown }) {
  if (value == null || value === "") return <div className="text-sm text-muted-foreground italic">— vazio</div>;
  if (isFileField(field.type as FieldType)) {
    const files = (value as Array<{ path: string; name: string }>) ?? [];
    if (files.length === 0) return <div className="text-sm text-muted-foreground italic">— sem arquivos</div>;
    return (
      <ul className="text-sm space-y-1">
        {files.map((file, i) => (
          <li key={i}>
            <button type="button" className="text-primary underline" onClick={() => openFile(file.path)}>{file.name}</button>
          </li>
        ))}
      </ul>
    );
  }
  if (Array.isArray(value)) return <div className="text-sm">{value.join(", ")}</div>;
  return <div className="text-sm whitespace-pre-wrap">{String(value)}</div>;
}

async function openFile(path: string) {
  const { data, error } = await supabase.storage.from("form-uploads").createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) { toast.error("Não foi possível abrir o arquivo."); return; }
  window.open(data.signedUrl, "_blank");
}

// ---------- Utilitários ----------

function stringifyAnswer(value: unknown, field: FormFieldRow): string {
  if (value == null) return "";
  if (isFileField(field.type as FieldType)) {
    const arr = (value as Array<{ name: string }>) ?? [];
    return arr.map((f) => f.name).join("; ");
  }
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
