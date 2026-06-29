/**
 * Tipos e constantes do módulo de Formulários Dinâmicos.
 * Mantemos as definições centralizadas para que renderer, builder e validadores
 * compartilhem exatamente o mesmo contrato.
 */
import type { Tables } from "@/integrations/supabase/types";

export type FormRow = Tables<"forms">;
export type FormFieldRow = Tables<"form_fields">;
export type FormSubmissionRow = Tables<"form_submissions">;
export type FormAnswerRow = Tables<"form_answers">;

/** Identificadores de cada tipo de campo suportado pelo construtor. */
export type FieldType =
  | "text" | "textarea" | "email" | "tel" | "cpf" | "rg" | "cep"
  | "city" | "state" | "address" | "number_int" | "number_decimal"
  | "date" | "time" | "datetime" | "select" | "radio" | "checkbox"
  | "file" | "image" | "url" | "password" | "hidden"
  | "heading" | "separator" | "info";

export type FieldOption = { label: string; value: string };

export type FieldValidation = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  message?: string;
};

export type FieldFileConfig = {
  accept?: string[];      // mime types
  maxSizeMb?: number;     // tamanho máximo por arquivo
  maxFiles?: number;      // quantidade máxima de arquivos
};

/** Catálogo de tipos exibido no painel de paleta. */
export const FIELD_TYPE_CATALOG: Array<{
  type: FieldType;
  label: string;
  group: "Básico" | "Identificação" | "Endereço" | "Numérico" | "Data e Hora" | "Escolha" | "Arquivo" | "Layout";
  hasOptions?: boolean;
  isFile?: boolean;
  isLayout?: boolean;
}> = [
  { type: "text", label: "Texto", group: "Básico" },
  { type: "textarea", label: "Área de texto", group: "Básico" },
  { type: "email", label: "E-mail", group: "Básico" },
  { type: "tel", label: "Telefone", group: "Básico" },
  { type: "url", label: "URL", group: "Básico" },
  { type: "password", label: "Senha", group: "Básico" },
  { type: "hidden", label: "Campo oculto", group: "Básico" },
  { type: "cpf", label: "CPF", group: "Identificação" },
  { type: "rg", label: "RG", group: "Identificação" },
  { type: "cep", label: "CEP", group: "Endereço" },
  { type: "city", label: "Cidade", group: "Endereço" },
  { type: "state", label: "Estado", group: "Endereço" },
  { type: "address", label: "Endereço", group: "Endereço" },
  { type: "number_int", label: "Número inteiro", group: "Numérico" },
  { type: "number_decimal", label: "Número decimal", group: "Numérico" },
  { type: "date", label: "Data", group: "Data e Hora" },
  { type: "time", label: "Hora", group: "Data e Hora" },
  { type: "datetime", label: "Data e Hora", group: "Data e Hora" },
  { type: "select", label: "Seleção", group: "Escolha", hasOptions: true },
  { type: "radio", label: "Radio", group: "Escolha", hasOptions: true },
  { type: "checkbox", label: "Checkbox", group: "Escolha", hasOptions: true },
  { type: "file", label: "Arquivo", group: "Arquivo", isFile: true },
  { type: "image", label: "Imagem", group: "Arquivo", isFile: true },
  { type: "heading", label: "Título", group: "Layout", isLayout: true },
  { type: "separator", label: "Separador", group: "Layout", isLayout: true },
  { type: "info", label: "Mensagem informativa", group: "Layout", isLayout: true },
];

export const FIELD_TYPE_META: Record<FieldType, typeof FIELD_TYPE_CATALOG[number]> =
  Object.fromEntries(FIELD_TYPE_CATALOG.map((f) => [f.type, f])) as never;

/** MIME types padrão aceitos para upload. */
export const DEFAULT_ACCEPT_FILE = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
export const DEFAULT_ACCEPT_IMAGE = ["image/jpeg", "image/png", "image/webp"];

/** Estado completo de um campo no construtor (espelha a linha do banco). */
export type BuilderField = {
  id?: string;                 // só presente quando o campo já existe no banco
  type: FieldType;
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  width: "50" | "100";
  order_index: number;
  options: FieldOption[];
  validation: FieldValidation;
  file_config: FieldFileConfig;
};

/** Converte uma linha do banco em um BuilderField tipado. */
export function rowToBuilderField(r: FormFieldRow): BuilderField {
  return {
    id: r.id,
    type: r.type as FieldType,
    name: r.name,
    label: r.label,
    description: r.description ?? undefined,
    placeholder: r.placeholder ?? undefined,
    required: r.required,
    width: (r.width as "50" | "100") ?? "100",
    order_index: r.order_index,
    options: (r.options as FieldOption[] | null) ?? [],
    validation: (r.validation as FieldValidation | null) ?? {},
    file_config: (r.file_config as FieldFileConfig | null) ?? {},
  };
}

/** Tipos puramente visuais não geram valor para envio. */
export const LAYOUT_TYPES: FieldType[] = ["heading", "separator", "info"];
export const isLayoutField = (t: FieldType) => LAYOUT_TYPES.includes(t);
export const isFileField = (t: FieldType) => t === "file" || t === "image";
