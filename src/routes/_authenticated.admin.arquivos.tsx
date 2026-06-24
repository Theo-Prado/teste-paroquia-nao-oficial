import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, publicMediaUrl } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/arquivos")({
  component: ArquivosAdmin,
});

function ArquivosAdmin() {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const { data } = useQuery({
    queryKey: ["admin-arquivos"],
    queryFn: async () => (await supabase.from("arquivos").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const handle = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `biblioteca/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); continue; }
      await supabase.from("arquivos").insert({ nome: file.name, arquivo: path, tipo: file.type, tamanho: file.size });
    }
    qc.invalidateQueries({ queryKey: ["admin-arquivos"] });
    toast.success("Enviado.");
  };

  const del = useMutation({
    mutationFn: async (a: { id: string; arquivo: string }) => {
      await supabase.storage.from("media").remove([a.arquivo]);
      const { error } = await supabase.from("arquivos").delete().eq("id", a.id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-arquivos"] }); },
  });

  return (
    <AdminLayout title="Biblioteca de arquivos">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => ref.current?.click()}><Upload className="mr-2 h-4 w-4" /> Enviar arquivos</Button>
        <input ref={ref} type="file" hidden multiple onChange={(e) => { if (e.target.files) handle(e.target.files); e.target.value = ""; }} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(data ?? []).map((a) => {
          const url = publicMediaUrl(a.arquivo);
          const isImg = (a.tipo ?? "").startsWith("image/");
          return (
            <div key={a.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {isImg ? <img src={url} alt={a.nome} className="h-full w-full object-cover" /> : <span className="text-3xl">📄</span>}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium" title={a.nome}>{a.nome}</p>
                <p className="text-[11px] text-muted-foreground">{formatDateTime(a.created_at)}</p>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copiada"); }}><Copy className="h-3 w-3 mr-1" /> URL</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir?")) del.mutate({ id: a.id, arquivo: a.arquivo }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            </div>
          );
        })}
        {data?.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">Nenhum arquivo.</p>}
      </div>
    </AdminLayout>
  );
}
