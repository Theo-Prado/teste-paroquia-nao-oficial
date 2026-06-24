import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter — Paróquia Carlo Acutis" },
      { name: "description", content: "Receba notícias da paróquia direto no seu e-mail." },
      { property: "og:url", content: "/newsletter" },
    ],
    links: [{ rel: "canonical", href: "/newsletter" }],
  }),
  component: Newsletter,
});

const schema = z.object({
  nome: z.string().trim().max(100).optional(),
  email: z.string().trim().email("E-mail inválido").max(255),
});

function Newsletter() {
  const [form, setForm] = useState({ nome: "", email: "" });
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("newsletter").insert({ nome: parsed.data.nome ?? null, email: parsed.data.email });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info("Este e-mail já está inscrito.");
      else toast.error("Não foi possível cadastrar.");
      return;
    }
    toast.success("Inscrição confirmada!");
    setForm({ nome: "", email: "" });
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-4xl font-semibold sm:text-5xl">Newsletter paroquial</h1>
        <p className="mt-3 text-muted-foreground">Receba notícias, eventos e palavras de fé diretamente no seu e-mail.</p>

        <form onSubmit={submit} className="mt-10 space-y-4 rounded-xl border border-border bg-card p-6 text-left">
          <div><Label htmlFor="nome">Nome (opcional)</Label><Input id="nome" maxLength={100} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Inscrevendo..." : "Quero receber"}</Button>
        </form>
      </div>
    </SiteLayout>
  );
}
