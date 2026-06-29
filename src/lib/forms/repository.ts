/**
 * Repository: encapsula todas as queries Supabase do módulo Forms.
 * Centralizar aqui evita SQL/Supabase espalhado nas rotas e facilita testes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BuilderField, FormFieldRow, FormRow } from "./types";

export type FormSettings = {
  successMessage?: string;
  errorMessage?: string;
  acceptResponses?: boolean;
  allowMultiplePerUser?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  responseLimit?: number | null;
};

/** Converte colunas do banco em DTO de settings (UI-friendly). */
export function rowToSettings(r: FormRow): FormSettings {
  return {
    successMessage: r.success_message,
    errorMessage: r.error_message,
    acceptResponses: r.accept_submissions,
    allowMultiplePerUser: r.allow_multiple,
    startsAt: r.start_at,
    endsAt: r.end_at,
    responseLimit: r.submission_limit,
  };
}

/** Converte settings da UI para colunas do banco. */
function settingsToColumns(s: FormSettings) {
  return {
    success_message: s.successMessage ?? "Resposta enviada com sucesso. Obrigado!",
    error_message: s.errorMessage ?? "Houve um erro ao enviar. Tente novamente.",
    accept_submissions: s.acceptResponses ?? true,
    allow_multiple: s.allowMultiplePerUser ?? true,
    start_at: s.startsAt ?? null,
    end_at: s.endsAt ?? null,
    submission_limit: s.responseLimit ?? null,
  };
}

export const formsRepository = {
  /** Lista todos os formulários do admin. */
  async listAdmin() {
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Obtém um formulário publicado pelo slug, com seus campos. */
  async getPublicBySlug(slug: string) {
    const { data: form, error } = await supabase
      .from("forms")
      .select("*")
      .eq("slug", slug)
      .eq("status", "publicado")
      .maybeSingle();
    if (error) throw error;
    if (!form) return null;
    const { data: fields } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", form.id)
      .order("order_index", { ascending: true });
    return { form: form as FormRow, fields: (fields ?? []) as FormFieldRow[] };
  },

  /** Carrega formulário + campos para edição no admin. */
  async getAdminById(id: string) {
    const { data: form, error } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!form) return null;
    const { data: fields } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", id)
      .order("order_index", { ascending: true });
    return { form: form as FormRow, fields: (fields ?? []) as FormFieldRow[] };
  },

  /** Cria ou atualiza um formulário (sem alterar os campos). */
  async upsertForm(input: {
    id?: string;
    title: string;
    slug: string;
    description?: string | null;
    category?: string | null;
    status: "rascunho" | "publicado" | "arquivado";
    settings: FormSettings;
  }) {
    const base = {
      title: input.title, slug: input.slug, description: input.description ?? null,
      category: input.category ?? null, status: input.status, ...settingsToColumns(input.settings),
    };
    if (input.id) {
      const { error } = await supabase.from("forms").update(base).eq("id", input.id);
      if (error) throw error;
      return input.id;
    }
    const { data, error } = await supabase.from("forms").insert(base).select("id").single();
    if (error) throw error;
    return data.id as string;
  },

  /** Substitui completamente o conjunto de campos do formulário. */
  async replaceFields(formId: string, fields: BuilderField[]) {
    const { error: delErr } = await supabase.from("form_fields").delete().eq("form_id", formId);
    if (delErr) throw delErr;
    if (fields.length === 0) return;
    const rows = fields.map((f, i) => ({
      form_id: formId,
      type: f.type,
      name: f.name,
      label: f.label,
      description: f.description ?? null,
      placeholder: f.placeholder ?? null,
      required: f.required,
      width: f.width,
      order_index: i,
      options: f.options ?? [],
      validation: f.validation ?? {},
      file_config: f.file_config ?? {},
    }));
    const { error } = await supabase.from("form_fields").insert(rows);
    if (error) throw error;
  },

  /** Duplica um formulário (incluindo campos). */
  async duplicate(id: string) {
    const original = await formsRepository.getAdminById(id);
    if (!original) throw new Error("Formulário não encontrado");
    const newSlug = `${original.form.slug}-${Date.now().toString(36)}`;
    const newId = await formsRepository.upsertForm({
      title: `${original.form.title} (cópia)`,
      slug: newSlug,
      description: original.form.description,
      category: original.form.category,
      status: "rascunho",
      settings: rowToSettings(original.form),
    });
    const newFields: BuilderField[] = original.fields.map((r, i) => ({
      type: r.type as BuilderField["type"],
      name: r.name,
      label: r.label,
      description: r.description ?? undefined,
      placeholder: r.placeholder ?? undefined,
      required: r.required,
      width: (r.width as "50" | "100") ?? "100",
      order_index: i,
      options: (r.options as BuilderField["options"]) ?? [],
      validation: (r.validation as BuilderField["validation"]) ?? {},
      file_config: (r.file_config as BuilderField["file_config"]) ?? {},
    }));
    await formsRepository.replaceFields(newId, newFields);
    return newId;
  },

  async deleteForm(id: string) {
    const { error } = await supabase.from("forms").delete().eq("id", id);
    if (error) throw error;
  },

  /** Estatísticas para dashboard. */
  async stats() {
    const [forms, subs] = await Promise.all([
      supabase.from("forms").select("id, title", { count: "exact" }),
      supabase.from("form_submissions").select("id, form_id, created_at", { count: "exact" }),
    ]);
    const counts: Record<string, number> = {};
    (subs.data ?? []).forEach((s) => { counts[s.form_id] = (counts[s.form_id] ?? 0) + 1; });
    let topId: string | null = null;
    let topN = 0;
    for (const [k, v] of Object.entries(counts)) if (v > topN) { topN = v; topId = k; }
    const top = topId ? (forms.data ?? []).find((f) => f.id === topId) ?? null : null;
    const last = (subs.data ?? []).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
    return {
      totalForms: forms.count ?? 0,
      totalSubmissions: subs.count ?? 0,
      topForm: top ? { id: top.id, title: top.title, count: topN } : null,
      lastSubmissionAt: last?.created_at ?? null,
    };
  },
};
