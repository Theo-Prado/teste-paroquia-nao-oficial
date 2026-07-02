import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://paroquia-sao-jose-lp-nao-oficial.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const [{ data: posts }, { data: eventos }] = await Promise.all([
          sb.from("postagens").select("slug, publicado_em").eq("status", "publicado"),
          sb.from("eventos").select("slug, updated_at"),
        ]);
        const staticPaths = ["/", "/noticias", "/agenda", "/missas", "/galeria", "/sobre", "/contato", "/newsletter"];
        const entries: { loc: string; lastmod?: string }[] = [
          ...staticPaths.map((p) => ({ loc: p })),
          ...(posts ?? []).map((p) => ({ loc: `/noticias/${p.slug}`, lastmod: p.publicado_em ?? undefined })),
        ];
        void eventos;
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) => `  <url><loc>${BASE_URL}${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
