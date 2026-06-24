import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { publicMediaUrl } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (path: string | null) => void;
  folder?: string;
}

export function ImagePicker({ value, onChange, folder = "imagens" }: Props) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Máximo 8MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (error) { toast.error("Falha no upload: " + error.message); return; }
    onChange(path);
    await supabase.from("arquivos").insert({ nome: file.name, arquivo: path, tipo: file.type, tamanho: file.size });
  };

  return (
    <div>
      {value ? (
        <div className="relative">
          <img src={publicMediaUrl(value)} alt="" className="aspect-video w-full rounded-md object-cover" />
          <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:border-primary/40 transition-colors"
        >
          {uploading ? <span className="text-xs">Enviando...</span> : <>
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">Clique para enviar</span>
          </>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {value && (
        <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => ref.current?.click()}>
          <Upload className="mr-2 h-3 w-3" /> Trocar imagem
        </Button>
      )}
    </div>
  );
}
