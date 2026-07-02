import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, MapPin, Phone, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useConfig } from "@/lib/site-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Paróquia Carlo Acutis" },
      { name: "description", content: "Envie sua mensagem ou encontre nosso telefone, e-mail e endereço." },
      { property: "og:url", content: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/contato" },
    ],
    links: [{ rel: "canonical", href: "https://paroquia-sao-jose-lp-nao-oficial.lovable.app/contato" }],
  }),
  component: Contato,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  assunto: z.string().trim().max(150).optional(),
  mensagem: z.string().trim().min(10, "Mensagem muito curta").max(2000),
});

function Contato() {
  const cfg = useConfig();
  const [form, setForm] = useState({ nome: "", email: "", assunto: "", mensagem: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contato_mensagens").insert({
      nome: parsed.data.nome,
      email: parsed.data.email,
      assunto: parsed.data.assunto ?? null,
      mensagem: parsed.data.mensagem,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    toast.success("Mensagem enviada! Responderemos em breve.");
    setForm({ nome: "", email: "", assunto: "", mensagem: "" });
  };

  return (
    <SiteLayout>
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Fale conosco</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Contato</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Sua mensagem é importante para nós.</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <aside className="space-y-5 lg:col-span-1">
          {cfg?.endereco && (
            <InfoLine icon={<MapPin className="h-5 w-5" />} title="Endereço" content={cfg.endereco} />
          )}
          {cfg?.telefone && (
            <InfoLine icon={<Phone className="h-5 w-5" />} title="Telefone" content={cfg.telefone} href={`tel:${cfg.telefone}`} />
          )}
          {cfg?.whatsapp && (
            <InfoLine icon={<MessageCircle className="h-5 w-5" />} title="WhatsApp" content={cfg.whatsapp} href={`https://wa.me/${cfg.whatsapp.replace(/\D/g, "")}`} />
          )}
          {cfg?.email && (
            <InfoLine icon={<Mail className="h-5 w-5" />} title="E-mail" content={cfg.email} href={`mailto:${cfg.email}`} />
          )}
          {cfg?.endereco && (
            <div className="overflow-hidden rounded-lg border border-border">
              <iframe
                title="Mapa"
                className="h-64 w-full"
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(cfg.endereco)}&output=embed`}
              />
            </div>
          )}
        </aside>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6 lg:col-span-2 lg:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nome" label="Nome">
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required maxLength={100} />
            </Field>
            <Field id="email" label="E-mail">
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
            </Field>
          </div>
          <Field id="assunto" label="Assunto">
            <Input id="assunto" value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} maxLength={150} />
          </Field>
          <Field id="mensagem" label="Mensagem">
            <Textarea id="mensagem" rows={6} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} required maxLength={2000} />
          </Field>
          <Button type="submit" size="lg" disabled={loading}>
            <Send className="mr-2 h-4 w-4" /> {loading ? "Enviando..." : "Enviar mensagem"}
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function InfoLine({ icon, title, content, href }: { icon: React.ReactNode; title: string; content: string; href?: string }) {
  const inner = (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-sm font-medium">{content}</p>
      </div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer" className="block rounded-lg border border-border bg-card p-4 hover:border-primary/40">{inner}</a>
    : <div className="rounded-lg border border-border bg-card p-4">{inner}</div>;
}
