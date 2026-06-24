import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, Star, Pin, Copy } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, makeSlug } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/postagens/")({
  component: PostagensList,
});

function PostagensList() {
  const qc = useQueryClient();
  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("postagens")
        .select("id, titulo, slug, status, destaque, fixado, publicado_em, created_at, conteudo, resumo, imagem, categoria_id")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("postagens").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-posts"] }); },
  });

  const toggleField = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "destaque" | "fixado"; value: boolean }) => {
      const update = field === "destaque" ? { destaque: value } : { fixado: value };
      const { error } = await supabase.from("postagens").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const duplicate = useMutation({
    mutationFn: async (p: { titulo: string; conteudo: string; resumo: string | null; imagem: string | null; categoria_id: string | null }) => {
      const titulo = p.titulo + " (cópia)";
      const slug = makeSlug(titulo) + "-" + Date.now().toString(36);
      const { error } = await supabase.from("postagens").insert({
        titulo, slug, conteudo: p.conteudo, resumo: p.resumo, imagem: p.imagem, categoria_id: p.categoria_id, status: "rascunho",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Duplicado."); qc.invalidateQueries({ queryKey: ["admin-posts"] }); },
  });

  return (
    <AdminLayout title="Postagens">
      <div className="mb-6 flex justify-end">
        <Button asChild><Link to="/admin/postagens/novo"><Plus className="mr-2 h-4 w-4" /> Nova postagem</Link></Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(posts ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.titulo}</div>
                  <div className="mt-1 flex gap-1.5">
                    {p.destaque && <Badge variant="secondary" className="text-[10px]">Destaque</Badge>}
                    {p.fixado && <Badge variant="secondary" className="text-[10px]">Fixado</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={p.status === "publicado" ? "default" : p.status === "agendado" ? "secondary" : "outline"}>
                    {p.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.publicado_em ?? p.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" asChild title="Ver"><a href={`/noticias/${p.slug}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" size="icon" title="Destaque" onClick={() => toggleField.mutate({ id: p.id, field: "destaque", value: !p.destaque })}><Star className={`h-4 w-4 ${p.destaque ? "fill-gold text-gold" : ""}`} /></Button>
                    <Button variant="ghost" size="icon" title="Fixar" onClick={() => toggleField.mutate({ id: p.id, field: "fixado", value: !p.fixado })}><Pin className={`h-4 w-4 ${p.fixado ? "text-primary" : ""}`} /></Button>
                    <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicate.mutate({ titulo: p.titulo, conteudo: p.conteudo, resumo: p.resumo, imagem: p.imagem, categoria_id: p.categoria_id })}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" asChild title="Editar"><Link to="/admin/postagens/$id" params={{ id: p.id }}><Edit className="h-4 w-4" /></Link></Button>
                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => { if (confirm(`Excluir "${p.titulo}"?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {posts?.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nenhuma postagem ainda. Crie a primeira!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
