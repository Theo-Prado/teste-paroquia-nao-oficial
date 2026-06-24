import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth, isStaff } from "@/lib/site-context";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Paróquia Carlo Acutis" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const pwSchema = z.string().min(6, "Senha de no mínimo 6 caracteres").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({ nome: "", email: "", password: "" });

  useEffect(() => {
    if (user) {
      navigate({ to: isStaff(user) ? "/admin" : "/", replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(login.email); pwSchema.parse(login.password); }
    catch (err) { toast.error((err as z.ZodError).issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: login.email, password: login.password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(signup.email); pwSchema.parse(signup.password); }
    catch (err) { toast.error((err as z.ZodError).issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signup.email,
      password: signup.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name: signup.nome },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada! Verifique seu e-mail se necessário.");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar com Google.");
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-center">Acesso ao portal</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Entre para administrar o site ou criar uma conta.</p>

        <Tabs defaultValue="login" className="mt-8">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 rounded-lg border border-border bg-card p-6">
              <div><Label htmlFor="le">E-mail</Label><Input id="le" type="email" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></div>
              <div><Label htmlFor="lp">Senha</Label><Input id="lp" type="password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>Entrar com Google</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 rounded-lg border border-border bg-card p-6">
              <div><Label htmlFor="sn">Nome</Label><Input id="sn" required value={signup.nome} onChange={(e) => setSignup({ ...signup, nome: e.target.value })} /></div>
              <div><Label htmlFor="se">E-mail</Label><Input id="se" type="email" required value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} /></div>
              <div><Label htmlFor="sp">Senha</Label><Input id="sp" type="password" required value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
              <p className="text-xs text-center text-muted-foreground">O primeiro usuário a se cadastrar recebe acesso de administrador.</p>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted-foreground hover:text-primary">← Voltar ao site</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
