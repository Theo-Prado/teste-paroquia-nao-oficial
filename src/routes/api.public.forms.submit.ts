/**
 * Endpoint público para receber respostas dos formulários dinâmicos.
 * Fluxo:
 *  1. Lê multipart/form-data
 *  2. Busca formulário + campos
 *  3. Aplica rate limit por IP (memória do processo)
 *  4. Valida no servidor com o mesmo schema Zod usado no client
 *  5. Faz upload dos arquivos para o bucket privado `form-uploads`
 *  6. Persiste submission + answers
 *  7. Registra log de auditoria
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { buildFormSchemaFromRows } from "@/lib/forms/validators";
import { isFileField, isLayoutField, type FieldType } from "@/lib/forms/types";

// Janela de rate-limit em memória (best effort, não persiste entre instâncias).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const rateMap = new Map<string, { count: number; reset: number }>();

function rateLimitOk(key: string) {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || entry.reset < now) {
    rateMap.set(key, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export const Route = createFileRoute("/api/public/forms/submit")({
  server: {
    handlers: {
      POST: async () => {
        const req = getRequest();
        const ip = clientIp(req);
        if (!rateLimitOk(ip)) {
          return Response.json({ ok: false, error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
        }

        let formData: FormData;
        try {
          formData = await req.formData();
        } catch {
          return Response.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
        }

        const slug = String(formData.get("slug") ?? "");
        if (!slug) return Response.json({ ok: false, error: "Slug ausente." }, { status: 400 });

        // Usa anon key (publishable) — RLS é quem decide o que entra.
        const sb = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data: form, error: formErr } = await sb
          .from("forms")
          .select("*")
          .eq("slug", slug)
          .eq("status", "publicado")
          .maybeSingle();
        if (formErr || !form) {
          return Response.json({ ok: false, error: "Formulário indisponível." }, { status: 404 });
        }

        // Janela de aceitação
        const now = new Date();
        if (!form.accept_submissions || !form.active) {
          return Response.json({ ok: false, error: "Formulário fechado." }, { status: 403 });
        }
        if (form.start_at && now < new Date(form.start_at)) {
          return Response.json({ ok: false, error: "Formulário ainda não aberto." }, { status: 403 });
        }
        if (form.end_at && now > new Date(form.end_at)) {
          return Response.json({ ok: false, error: "Formulário encerrado." }, { status: 403 });
        }

        // Limite global de respostas
        if (form.submission_limit != null) {
          const { count } = await sb
            .from("form_submissions")
            .select("id", { count: "exact", head: true })
            .eq("form_id", form.id);
          if ((count ?? 0) >= form.submission_limit) {
            return Response.json({ ok: false, error: "Limite de respostas atingido." }, { status: 403 });
          }
        }

        const { data: fields, error: fieldsErr } = await sb
          .from("form_fields")
          .select("*")
          .eq("form_id", form.id)
          .order("order_index", { ascending: true });
        if (fieldsErr || !fields) {
          return Response.json({ ok: false, error: "Erro ao carregar campos." }, { status: 500 });
        }

        // Validação dos dados textuais com o mesmo schema Zod
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(String(formData.get("data") ?? "{}"));
        } catch {
          return Response.json({ ok: false, error: "JSON inválido." }, { status: 400 });
        }
        const schema = buildFormSchemaFromRows(fields, { server: true });
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({
            ok: false, error: "Dados inválidos.",
            issues: parsed.error.flatten().fieldErrors,
          }, { status: 400 });
        }

        // Upload de arquivos (campos do tipo file/image)
        const uploads: Record<string, Array<{ path: string; name: string; size: number; type: string }>> = {};
        for (const f of fields) {
          if (!isFileField(f.type as FieldType)) continue;
          const files = formData.getAll(`file:${f.name}`).filter((v): v is File => v instanceof File);
          if (files.length === 0) {
            if (f.required) {
              return Response.json({ ok: false, error: `Arquivo obrigatório: ${f.label}` }, { status: 400 });
            }
            continue;
          }
          const cfg = (f.file_config as { accept?: string[]; maxSizeMb?: number; maxFiles?: number } | null) ?? {};
          if (cfg.maxFiles && files.length > cfg.maxFiles) {
            return Response.json({ ok: false, error: `Máximo ${cfg.maxFiles} arquivos em ${f.label}` }, { status: 400 });
          }
          const maxBytes = (cfg.maxSizeMb ?? 10) * 1024 * 1024;
          uploads[f.name] = [];
          for (const file of files) {
            if (file.size > maxBytes) {
              return Response.json({ ok: false, error: `Arquivo excede ${cfg.maxSizeMb ?? 10}MB em ${f.label}` }, { status: 400 });
            }
            if (cfg.accept && cfg.accept.length > 0 && !cfg.accept.includes(file.type)) {
              return Response.json({ ok: false, error: `Tipo de arquivo não permitido em ${f.label}` }, { status: 400 });
            }
            const path = `${form.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
            const { error: upErr } = await sb.storage.from("form-uploads").upload(path, file, {
              contentType: file.type, upsert: false,
            });
            if (upErr) {
              return Response.json({ ok: false, error: "Falha no upload de arquivo." }, { status: 500 });
            }
            uploads[f.name].push({ path, name: file.name, size: file.size, type: file.type });
          }
        }

        // Insere a submission
        const { data: sub, error: subErr } = await sb
          .from("form_submissions")
          .insert({
            form_id: form.id,
            ip,
            user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500),
            status: "novo",
          })
          .select("id")
          .single();
        if (subErr || !sub) {
          return Response.json({ ok: false, error: "Erro ao registrar resposta." }, { status: 500 });
        }

        // Constrói as answers (uma por campo, layout fields ignorados)
        const answersRows = fields
          .filter((f) => !isLayoutField(f.type as FieldType))
          .map((f) => {
            const isFile = isFileField(f.type as FieldType);
            const raw: unknown = isFile ? (uploads[f.name] ?? []) : parsed.data[f.name];
            return {
              submission_id: sub.id,
              field_id: f.id,
              value: raw === undefined ? null : raw,
            };
          });
        if (answersRows.length > 0) {
          const { error: ansErr } = await sb.from("form_answers").insert(answersRows);
          if (ansErr) {
            return Response.json({ ok: false, error: "Erro ao salvar respostas." }, { status: 500 });
          }
        }

        // Log de auditoria (best-effort)
        try {
          await sb.from("logs").insert({
            acao: "form_submission",
            entidade: "form",
            entidade_id: form.id,
            detalhes: { submission_id: sub.id, ip },
          });
        } catch { /* ignore */ }

        return Response.json({ ok: true, id: sub.id });
      },
    },
  },
});
