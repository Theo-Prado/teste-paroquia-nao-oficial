import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePicker } from "@/components/image-picker";
import { supabase } from "@/integrations/supabase/client";
import { makeSlug, publicMediaUrl } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/galeria")({
  component: GaleriaAdmin,
});

function GaleriaAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: "", descricao: "", capa: null as string | null });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: albuns } = useQuery({
    queryKey: ["admin-albuns"],
    queryFn: async () => (await supabase.from("albuns").select("*, fotos(id, url)").order("created_at", { ascending: false })).data ?? [],
  });

  const createAlbum = useMutation({
    mutationFn: async () => {
      if (!form.titulo) throw new Error("Título obrigatório.");
      const { error } = await supabase.from("albuns").insert({ titulo: form.titulo, slug: makeSlug(form.titulo) + "-" + Date.now().toString(36), descricao: form.descricao || null, capa: form.capa });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Álbum criado."); setOpen(false); setForm({ titulo: "", descricao: "", capa: null }); qc.invalidateQueries({ queryKey: ["admin-albuns"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delAlbum = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("albuns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Excluído."); qc.invalidateQueries({ queryKey: ["admin-albuns"] }); },
  });

  const delFoto = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("fotos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-albuns"] }),
  });

  const uploadFotos = async (files: FileList) => {
    if (!albumOpen) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop();
      const path = `galeria/${albumOpen}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); continue; }
      await supabase.from("fotos").insert({ album_id: albumOpen, url: path });
    }
    qc.invalidateQueries({ queryKey: ["admin-albuns"] });
    toast.success("Fotos enviadas.");
  };

  const album = albuns?.find((a) => a.id === albumOpen);

  return (
    <AdminLayout title="Galeria">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo álbum</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(albuns ?? []).map((a) => (
          <div key={a.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-video bg-muted">
              {(a.capa || a.fotos?.[0]) && <img src={publicMediaUrl(a.capa ?? a.fotos[0].url)} alt={a.titulo} className="h-full w-full object-cover" />}
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg font-semibold">{a.titulo}</h3>
              <p className="text-xs text-muted-foreground">{a.fotos?.length ?? 0} fotos</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAlbumOpen(a.id)}>Gerenciar</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir álbum?")) delAlbum.mutate(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {albuns?.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">Nenhum álbum criado.</p>}
      </div>

      {/* Novo álbum */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo álbum</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label>Capa</Label><ImagePicker value={form.capa} onChange={(p) => setForm({ ...form, capa: p })} folder="galeria/capas" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAlbum.mutate()} disabled={createAlbum.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gerenciar fotos */}
      <Dialog open={!!albumOpen} onOpenChange={(v) => !v && setAlbumOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{album?.titulo}</DialogTitle></DialogHeader>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Enviar fotos</Button>
          <input ref={fileRef} type="file" hidden multiple accept="image/*" onChange={(e) => { if (e.target.files) uploadFotos(e.target.files); e.target.value = ""; }} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {album?.fotos?.map((f) => (
              <div key={f.id} className="relative group">
                <img src={publicMediaUrl(f.url)} alt="" className="aspect-square w-full rounded-md object-cover" />
                <button onClick={() => delFoto.mutate(f.id)} className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {(album?.fotos?.length ?? 0) === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Sem fotos.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
