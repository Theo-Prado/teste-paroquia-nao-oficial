import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useAuth, isStaff } from "@/lib/site-context";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  if (!isStaff(user)) {
    return (
      <AdminLayout title="Sem permissão">
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <h2 className="font-display text-2xl font-semibold">Acesso restrito</h2>
          <p className="mt-2 text-muted-foreground">Sua conta não tem permissão para acessar o painel administrativo.</p>
          <Button asChild className="mt-6"><Link to="/">Voltar ao site</Link></Button>
        </div>
      </AdminLayout>
    );
  }
  return <Outlet />;
}
