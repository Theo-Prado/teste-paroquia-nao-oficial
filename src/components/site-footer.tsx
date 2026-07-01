import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, Phone, MapPin } from "lucide-react";
import { useConfig } from "@/lib/site-context";

export function SiteFooter() {
  const cfg = useConfig();
  return (
    <footer className="mt-20 border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="font-display text-2xl font-semibold">{cfg?.nome_paroquia}</div>
          <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
            {cfg?.texto_institucional}
          </p>
          <div className="mt-5 flex gap-3">
            {cfg?.facebook && (
              <a href={cfg.facebook} target="_blank" rel="noreferrer" className="rounded-full border border-sidebar-border p-2 hover:border-gold hover:text-gold transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {cfg?.instagram && (
              <a href={cfg.instagram} target="_blank" rel="noreferrer" className="rounded-full border border-sidebar-border p-2 hover:border-gold hover:text-gold transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {cfg?.youtube && (
              <a href={cfg.youtube} target="_blank" rel="noreferrer" className="rounded-full border border-sidebar-border p-2 hover:border-gold hover:text-gold transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold text-gold">Navegação</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/noticias" className="hover:text-gold">Notícias</Link></li>
            <li><Link to="/agenda" className="hover:text-gold">Agenda</Link></li>
            <li><Link to="/missas" className="hover:text-gold">Missas e horários</Link></li>
            <li><Link to="/galeria" className="hover:text-gold">Galeria</Link></li>
            <li><Link to="/sobre" className="hover:text-gold">Sobre a paróquia</Link></li>
            <li><Link to="/contato" className="hover:text-gold">Fale conosco</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold text-gold">Contato</h4>
          <ul className="mt-3 space-y-3 text-sm text-sidebar-foreground/80">
            {cfg?.endereco && (<li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {cfg.endereco}</li>)}
            {cfg?.telefone && (<li className="flex gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /> {cfg.telefone}</li>)}
            {cfg?.email && (<li className="flex gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /> {cfg.email}</li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-sidebar-foreground/60 sm:px-6 lg:px-8">
          {cfg?.rodape}
        </div>
      </div>
    </footer>
  );
}
