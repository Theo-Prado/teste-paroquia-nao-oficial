import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasRole } from "@/lib/site-context";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsuariosAdmin,
});

const ROLES = ["admin", "editor", "moderador"] as const;

function UsuariosAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ user_id, role, active }: { user_id: string; role: string; active: boolean }) => {
      if (active) {
        const { error } = await supabase.from("user_roles").insert({ user_id, role: role as typeof ROLES[number] });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role as typeof ROLES[number]);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Atualizado."); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasRole(user, "admin")) return <AdminLayout title="Usuários"><p>Apenas administradores.</p></AdminLayout>;

  return (
    <AdminLayout title="Usuários & permissões">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Papéis</th></tr></thead>
          <tbody className="divide-y divide-border">
            {(data ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.map((r) => {
                      const active = u.roles.includes(r);
                      return (
                        <Button key={r} size="sm" variant={active ? "default" : "outline"} className="h-7 text-xs"
                          onClick={() => toggleRole.mutate({ user_id: u.id, role: r, active: !active })}
                          disabled={u.id === user?.id && r === "admin"}>
                          {r}
                        </Button>
                      );
                    })}
                    {u.roles.length === 0 && <Badge variant="outline">visitante</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
