import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/image-picker";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, useAuth, hasRole, type Configuracoes } from "@/lib/site-context";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfigAdmin,
});

function ConfigAdmin() {
  const cfg = useConfig();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState<Configuracoes | null>(null);

  // Fetch the email column separately (restricted to authenticated staff).
  useEffect(() => {
    if (!cfg || f) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("configuracoes").select("email").eq("id", 1).single();
      if (!cancelled) setF({ ...cfg, email: data?.email ?? null });
    })();
    return () => { cancelled = true; };
  }, [cfg, f]);

  const save = useMutation({
    mutationFn: async () => {
      if (!f) return;
      const { id, updated_at, ...rest } = f;
      void id; void updated_at;
      const { error } = await supabase.from("configuracoes").update(rest).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas."); qc.invalidateQueries({ queryKey: ["configuracoes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasRole(user, "admin")) return <AdminLayout title="Configurações"><p>Apenas administradores.</p></AdminLayout>;
  if (!f) return <AdminLayout title="Configurações"><p>Carregando...</p></AdminLayout>;

  const set = <K extends keyof Configuracoes>(k: K, v: Configuracoes[K]) => setF({ ...f, [k]: v });

  return (
    <AdminLayout title="Configurações gerais">
      <div className="space-y-6 max-w-4xl">
        <Section title="Identidade">
          <Grid>
            <Field label="Nome da paróquia"><Input value={f.nome_paroquia} onChange={(e) => set("nome_paroquia", e.target.value)} /></Field>
            <Field label="Nome do site"><Input value={f.nome_site} onChange={(e) => set("nome_site", e.target.value)} /></Field>
            <Field label="Subtítulo"><Input value={f.subtitulo ?? ""} onChange={(e) => set("subtitulo", e.target.value)} /></Field>
            <Field label="Slogan"><Input value={f.slogan ?? ""} onChange={(e) => set("slogan", e.target.value)} /></Field>
          </Grid>
          <Grid>
            <Field label="Logo (claro)"><ImagePicker value={f.logo} onChange={(p) => set("logo", p)} folder="branding" /></Field>
            <Field label="Logo (escuro)"><ImagePicker value={f.logo_dark} onChange={(p) => set("logo_dark", p)} folder="branding" /></Field>
          </Grid>
          <Field label="Favicon"><Input value={f.favicon ?? ""} onChange={(e) => set("favicon", e.target.value)} placeholder="caminho/da/imagem.ico" /></Field>
        </Section>

        <Section title="Banner principal">
          <Field label="Imagem do banner"><ImagePicker value={f.banner_principal} onChange={(p) => set("banner_principal", p)} folder="banners" /></Field>
          <Grid>
            <Field label="Título do banner"><Input value={f.banner_titulo ?? ""} onChange={(e) => set("banner_titulo", e.target.value)} /></Field>
            <Field label="Subtítulo do banner"><Input value={f.banner_subtitulo ?? ""} onChange={(e) => set("banner_subtitulo", e.target.value)} /></Field>
          </Grid>
        </Section>

        <Section title="Contato">
          <Grid>
            <Field label="Telefone"><Input value={f.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></Field>
            <Field label="WhatsApp (com DDI)"><Input value={f.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="5514999999999" /></Field>
            <Field label="E-mail"><Input value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Endereço"><Input value={f.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} /></Field>
          </Grid>
          <Field label="Horários de atendimento"><Input value={f.horarios_atendimento ?? ""} onChange={(e) => set("horarios_atendimento", e.target.value)} /></Field>
        </Section>

        <Section title="Redes sociais">
          <Grid>
            <Field label="Facebook"><Input value={f.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} placeholder="https://..." /></Field>
            <Field label="Instagram"><Input value={f.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="https://..." /></Field>
            <Field label="YouTube"><Input value={f.youtube ?? ""} onChange={(e) => set("youtube", e.target.value)} placeholder="https://..." /></Field>
            <Field label="Site externo"><Input value={f.site_externo ?? ""} onChange={(e) => set("site_externo", e.target.value)} /></Field>
          </Grid>
        </Section>

        <Section title="Conteúdo institucional">
          <Field label="Texto institucional"><Textarea rows={4} value={f.texto_institucional ?? ""} onChange={(e) => set("texto_institucional", e.target.value)} /></Field>
          <Field label="Rodapé"><Input value={f.rodape ?? ""} onChange={(e) => set("rodape", e.target.value)} /></Field>
        </Section>

        <Section title="SEO">
          <Field label="Meta title padrão"><Input value={f.meta_title ?? ""} onChange={(e) => set("meta_title", e.target.value)} maxLength={60} /></Field>
          <Field label="Meta description padrão"><Textarea rows={2} value={f.meta_description ?? ""} onChange={(e) => set("meta_description", e.target.value)} maxLength={160} /></Field>
        </Section>

        <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg"><Save className="mr-2 h-4 w-4" /> Salvar alterações</Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-display text-xl font-semibold border-b border-border pb-3 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
