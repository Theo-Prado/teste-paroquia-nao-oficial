import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Calendar, Clock, Images, MessageSquare,
  Mail, Inbox, Settings, Users, FileArchive, ScrollText, LogOut, Globe, Moon, Sun
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, useTheme, hasRole } from "@/lib/site-context";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/postagens", label: "Postagens", icon: FileText },
  { to: "/admin/eventos", label: "Eventos", icon: Calendar },
  { to: "/admin/missas", label: "Missas & Horários", icon: Clock },
  { to: "/admin/galeria", label: "Galeria", icon: Images },
  { to: "/admin/comentarios", label: "Comentários", icon: MessageSquare },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/admin/mensagens", label: "Mensagens", icon: Inbox },
  { to: "/admin/arquivos", label: "Arquivos", icon: FileArchive },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  { to: "/admin/logs", label: "Logs", icon: ScrollText, adminOnly: true },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
] as const;

export function AdminLayout({ children, title }: { children: ReactNode; title?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-gold-foreground font-display font-semibold">CA</div>
          <div>
            <div className="text-sm font-semibold leading-tight">Painel</div>
            <div className="text-[11px] text-sidebar-foreground/60 leading-tight">CMS Paroquial</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {items
            .filter((i) => !("adminOnly" in i && i.adminOnly) || hasRole(user, "admin"))
            .map((i) => {
              const active = i.exact ? path === i.to : path.startsWith(i.to);
              return (
                <Link
                  key={i.to}
                  to={i.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-gold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <i.icon className="h-4 w-4" />
                  {i.label}
                </Link>
              );
            })}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Link to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <Globe className="h-4 w-4" /> Ver site
          </Link>
          <button onClick={toggle} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight">{title ?? "Painel"}</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="md:hidden border-b border-border bg-background overflow-x-auto">
          <div className="flex gap-1 px-3 py-2">
            {items
              .filter((i) => !("adminOnly" in i && i.adminOnly) || hasRole(user, "admin"))
              .map((i) => (
                <Link key={i.to} to={i.to} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted"
                  activeProps={{ className: "text-primary bg-muted" }}
                  activeOptions={{ exact: !!i.exact }}>
                  {i.label}
                </Link>
              ))}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
