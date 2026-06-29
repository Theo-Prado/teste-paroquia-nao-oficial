/**
 * Construção dinâmica de schemas Zod a partir da definição dos campos.
 * Mesmo gerador é usado no client (react-hook-form) e no server (route de submit),
 * garantindo paridade entre validação visual e validação efetiva.
 */
import { z, type ZodTypeAny } from "zod";
import type { BuilderField, FieldType, FormFieldRow } from "./types";
import { isFileField, isLayoutField, rowToBuilderField } from "./types";
import { isValidCPF, UF_LIST } from "./format";

const onlyDigits = (s: string) => (s ?? "").replace(/\D+/g, "");

/** Aplica regras comuns (min/max/minLength/maxLength/regex) a um schema textual. */
function applyTextRules(base: z.ZodString, f: BuilderField): ZodTypeAny {
  let s: z.ZodString = base;
  const v = f.validation ?? {};
  if (v.minLength != null) s = s.min(v.minLength, v.message ?? `Mínimo ${v.minLength} caracteres`);
  if (v.maxLength != null) s = s.max(v.maxLength, v.message ?? `Máximo ${v.maxLength} caracteres`);
  if (v.regex) {
    try {
      s = s.regex(new RegExp(v.regex), v.message ?? "Formato inválido");
    } catch {
      // regex inválida no admin não derruba a aplicação
    }
  }
  return s;
}

/** Aplica regras numéricas (min/max). */
function applyNumberRules(base: z.ZodNumber, f: BuilderField): ZodTypeAny {
  let n: z.ZodNumber = base;
  const v = f.validation ?? {};
  if (v.min != null) n = n.min(v.min, v.message ?? `Valor mínimo: ${v.min}`);
  if (v.max != null) n = n.max(v.max, v.message ?? `Valor máximo: ${v.max}`);
  return n;
}

/** Gera o schema Zod para um único campo. */
function schemaForField(f: BuilderField, opts: { server: boolean }): ZodTypeAny {
  const required = f.required;

  // Campos puramente visuais não geram valor:
  if (isLayoutField(f.type)) return z.any().optional();

  // Arquivos são tratados separadamente (FormData), aqui só validamos no client a presença.
  if (isFileField(f.type)) {
    if (opts.server) return z.any().optional();
    const sch = z
      .array(z.instanceof(File))
      .max(f.file_config?.maxFiles ?? 10, `Máximo ${f.file_config?.maxFiles ?? 10} arquivo(s)`);
    return required ? sch.min(1, f.validation.message ?? "Envie ao menos um arquivo") : sch.optional();
  }

  const optionalize = <T extends ZodTypeAny>(s: T): ZodTypeAny =>
    required ? s : s.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));

  switch (f.type as FieldType) {
    case "email": {
      const base = z.string().trim().email(f.validation.message ?? "E-mail inválido");
      return optionalize(applyTextRules(base, f) as z.ZodString);
    }
    case "url": {
      const base = z.string().trim().url(f.validation.message ?? "URL inválida");
      return optionalize(applyTextRules(base, f) as z.ZodString);
    }
    case "cpf": {
      const s = z.string().trim().refine(
        (v) => !v || isValidCPF(v),
        f.validation.message ?? "CPF inválido",
      );
      return required ? s.refine((v) => !!v && isValidCPF(v), f.validation.message ?? "CPF inválido") : s.optional();
    }
    case "cep": {
      const s = z.string().trim().refine(
        (v) => !v || onlyDigits(v).length === 8,
        f.validation.message ?? "CEP inválido",
      );
      return required ? s.refine((v) => onlyDigits(v).length === 8, f.validation.message ?? "CEP inválido") : s.optional();
    }
    case "tel": {
      const s = z.string().trim().refine(
        (v) => !v || (onlyDigits(v).length >= 10 && onlyDigits(v).length <= 11),
        f.validation.message ?? "Telefone inválido",
      );
      return required ? s.refine((v) => onlyDigits(v).length >= 10, f.validation.message ?? "Telefone inválido") : s.optional();
    }
    case "state": {
      const s = z.string().trim().refine(
        (v) => !v || UF_LIST.includes(v.toUpperCase()),
        f.validation.message ?? "UF inválida",
      );
      return required ? s.min(2, f.validation.message ?? "Informe a UF") : s.optional();
    }
    case "number_int": {
      const base = z.coerce.number().int(f.validation.message ?? "Informe um inteiro");
      const rules = applyNumberRules(base, f);
      return required ? rules : (rules as z.ZodNumber).optional();
    }
    case "number_decimal": {
      const base = z.coerce.number();
      const rules = applyNumberRules(base, f);
      return required ? rules : (rules as z.ZodNumber).optional();
    }
    case "date":
    case "time":
    case "datetime": {
      const s = z.string().trim();
      return required ? s.min(1, f.validation.message ?? "Campo obrigatório") : s.optional();
    }
    case "select":
    case "radio": {
      const values = (f.options ?? []).map((o) => o.value);
      if (values.length === 0) return z.string().optional();
      const s = z.string().refine((v) => !v || values.includes(v), f.validation.message ?? "Opção inválida");
      return required ? s.refine((v) => values.includes(v), f.validation.message ?? "Selecione uma opção") : s.optional();
    }
    case "checkbox": {
      const values = (f.options ?? []).map((o) => o.value);
      const s = z.array(z.string()).refine(
        (arr) => arr.every((v) => values.includes(v)),
        f.validation.message ?? "Opção inválida",
      );
      return required ? s.min(1, f.validation.message ?? "Selecione ao menos uma opção") : s.optional().default([]);
    }
    case "hidden":
    case "password":
    case "city":
    case "address":
    case "rg":
    case "text":
    case "textarea":
    default: {
      const base = z.string().trim();
      const rules = applyTextRules(base, f) as z.ZodString;
      return required ? rules.min(1, f.validation.message ?? "Campo obrigatório") : optionalize(rules);
    }
  }
}

/** Monta o schema do formulário inteiro a partir das definições de campo. */
export function buildFormSchema(fields: BuilderField[], opts: { server: boolean } = { server: false }) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) {
    if (isLayoutField(f.type)) continue;
    shape[f.name] = schemaForField(f, opts);
  }
  return z.object(shape);
}

/** Aceita tanto registros do banco quanto definições do builder. */
export function buildFormSchemaFromRows(rows: FormFieldRow[], opts: { server: boolean } = { server: false }) {
  return buildFormSchema(rows.map(rowToBuilderField), opts);
}
