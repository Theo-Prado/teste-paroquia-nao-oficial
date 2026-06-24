import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TipTapEditor } from "@/components/tiptap-editor";
import { ImagePicker } from "@/components/image-picker";
import { supabase } from "@/integrations/supabase/client";
import { makeSlug } from "@/lib/utils";
import { useAuth } from "@/lib/site-context";

type FormState = {
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagem: string | null;
  categoria_id: string | null;
  status: "rascunho" | "publicado" | "agendado";
  agendamento: string;
  meta_title: string;
  meta_description: string;
};

const blank: FormState = {
  titulo: "", slug: "", resumo: "", conteudo: "", imagem: null, categoria_id: null,
  status: "rascunho", agendamento: "", meta_title: "", meta_description: "",
};

export const Route = createFileRoute("/_authenticated/admin/postagens/novo")({
  component: () => <PostEditor mode="new" />,
});

export function PostEditor({ mode, id }: { mode: "new" | "edit"; id?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(blank);
  const [autoSlug, setAutoSlug] = useState(true);

  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: async () => (await supabase.from("categorias").select("*").order("nome")).data ?? [],
  });

  const { data: existing } = useQuery({
    queryKey: ["edit-post", id],
    queryFn: async () => (await supabase.from("postagens").select("*").eq("id", id!).single()).data,
    enabled: mode === "edit" && !!id,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        titulo: existing.titulo, slug: existing.slug, resumo: existing.resumo ?? "",
        conteudo: existing.conteudo, imagem: existing.imagem, categoria_id: existing.categoria_id,
        status: existing.status, agendamento: existing.agendamento ?? "",
        meta_title: existing.meta_title ?? "", meta_description: existing.meta_description ?? "",
      });
      setAutoSlug(false);
    }
  }, [existing]);

  useEffect(() => { if (autoSlug && form.titulo) setForm((f) => ({ ...f, slug: makeSlug(f.titulo) })); }, [form.titulo, autoSlug]);

  const save = useMutation({
    mutationFn: async (publishNow: boolean) => {
      if (!form.titulo.trim()) throw new Error("Informe o título.");
      if (!form.slug.trim()) throw new Error("Informe o slug.");
      const status: FormState["status"] = publishNow ? "publicado" : form.agendamento ? "agendado" : form.status;
      const payload = {
        titulo: form.titulo.trim(),
        slug: form.slug.trim(),
        resumo: form.resumo.trim() || null,
        conteudo: form.conteudo,
        imagem: form.imagem,
        categoria_id: form.categoria_id || null,
        status,
        agendamento: form.agendamento || null,
        publicado_em: status === "publicado" ? (existing?.publicado_em ?? new Date().toISOString()) : null,
        autor_id: user?.id ?? null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      };
      if (mode === "edit" && id) {
        const { error } = await supabase.from("postagens").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("postagens").insert(payload);
        if (error) throw error;
      }
      await supabase.from("logs").insert({ usuario_id: user?.id ?? null, usuario_nome: user?.email ?? null, acao: mode === "edit" ? "atualizar_postagem" : "criar_postagem", entidade: "postagens", entidade_id: id ?? null });
    },
    onSuccess: () => { toast.success("Postagem salva."); navigate({ to: "/admin/postagens" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout title={mode === "edit" ? "Editar postagem" : "Nova postagem"}>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/postagens" })} className="mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="text-lg" />
          </div>
          <div>
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input id="slug" value={form.slug} onChange={(e) => { setAutoSlug(false); setForm({ ...form, slug: e.target.value }); }} />
          </div>
          <div>
            <Label htmlFor="resumo">Resumo</Label>
            <Textarea id="resumo" rows={2} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} maxLength={300} />
          </div>
          <div>
            <Label>Conteúdo *</Label>
            <TipTapEditor value={form.conteudo} onChange={(html) => setForm({ ...form, conteudo: html })} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h4 className="font-display text-sm font-semibold">SEO</h4>
            <div><Label htmlFor="mt">Meta title</Label><Input id="mt" value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={60} /></div>
            <div><Label htmlFor="md">Meta description</Label><Textarea id="md" rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={160} /></div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h4 className="font-display text-sm font-semibold">Publicação</h4>
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="agendado">Agendado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="agendamento">Agendar para</Label>
              <Input id="agendamento" type="datetime-local" value={form.agendamento ? form.agendamento.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, agendamento: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => save.mutate(true)} disabled={save.isPending}><Save className="mr-2 h-4 w-4" /> Publicar agora</Button>
              <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>Salvar rascunho</Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h4 className="font-display text-sm font-semibold">Categoria</h4>
            <select value={form.categoria_id ?? ""} onChange={(e) => setForm({ ...form, categoria_id: e.target.value || null })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">— Sem categoria —</option>
              {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h4 className="font-display text-sm font-semibold">Imagem de capa</h4>
            <ImagePicker value={form.imagem} onChange={(p) => setForm({ ...form, imagem: p })} />
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
