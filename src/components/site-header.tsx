import { Link } from "@tanstack/react-router";
import { Menu, X, Moon, Sun, LogIn, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useConfig, useTheme, useAuth, isStaff } from "@/lib/site-context";
import { Button } from "@/components/ui/button";
import { cn, publicMediaUrl } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Início" },
  { to: "/noticias", label: "Notícias" },
  { to: "/agenda", label: "Agenda" },
  { to: "/missas", label: "Missas" },
  { to: "/galeria", label: "Galeria" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const cfg = useConfig();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          {cfg?.logo ? (
            <img src={publicMediaUrl(cfg.logo)} alt={cfg.nome_paroquia} className="h-9 w-auto" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="font-display text-lg font-semibold">CA</span>
            </div>
          )}
          <div className="hidden sm:block">
            <div className="font-display text-lg font-semibold leading-tight">
              {cfg?.nome_paroquia ?? "Paróquia"}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">{cfg?.slogan ?? ""}</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user && isStaff(user) ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/admin">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Painel
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Entrar
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium rounded-md hover:bg-muted",
                )}
                activeProps={{ className: "text-primary bg-muted" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to={user && isStaff(user) ? "/admin" : "/auth"}
              onClick={() => setOpen(false)}
              className="mt-2 px-3 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground text-center"
            >
              {user && isStaff(user) ? "Painel administrativo" : "Entrar"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
