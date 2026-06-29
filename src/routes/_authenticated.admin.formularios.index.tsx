/**
 * Lista de formulários no painel administrativo.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, Copy, Reply } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formsRepository } from "@/lib/forms/repository";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/formularios/")({
  component: FormsList,
});

function FormsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: forms } = useQuery({
    queryKey: ["admin-forms"],
    queryFn: () => formsRepository.listAdmin(),
  });

  const del = useMutation({
    mutationFn: (id: string) => formsRepository.deleteForm(id),
    onSuccess: () => {
      toast.success("Formulário excluído.");
      qc.invalidateQueries({ queryKey: ["admin-forms"] });
    },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => formsRepository.duplicate(id),
    onSuccess: (newId) => {
      toast.success("Formulário duplicado.");
      qc.invalidateQueries({ queryKey: ["admin-forms"] });
      navigate({ to: "/admin/formularios/$id", params: { id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <AdminLayout title="Formulários">
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link to="/admin/formularios/novo"><Plus className="mr-2 h-4 w-4" /> Novo formulário</Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(forms ?? []).map((f) => (
              <tr key={f.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{f.title}</div>
                  {f.category && <div className="text-xs text-muted-foreground">{f.category}</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">/{f.slug}</td>
                <td className="px-4 py-3">
                  <Badge variant={f.status === "publicado" ? "default" : f.status === "arquivado" ? "outline" : "secondary"}>
                    {f.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(f.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" asChild title="Ver página pública">
                      <a href={`/formularios/${f.slug}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Respostas">
                      <Link to="/admin/formularios/respostas" search={{ form: f.id }}><Reply className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicate.mutate(f.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Editar">
                      <Link to="/admin/formularios/$id" params={{ id: f.id }}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Excluir"
                      onClick={() => { if (confirm(`Excluir "${f.title}"?`)) del.mutate(f.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {forms?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                Nenhum formulário ainda. Crie o primeiro!
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
