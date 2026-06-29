/**
 * Renderiza um formulário dinâmico completo: campos + envio + feedback.
 * Recebe a definição já carregada (form + fields). Toda a renderização é
 * orquestrada por dados — nada é hard-coded.
 */
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { FieldRenderer } from "./field-renderer";
import { buildFormSchemaFromRows } from "@/lib/forms/validators";
import { isFileField } from "@/lib/forms/types";
import type { FormFieldRow, FormRow } from "@/lib/forms/types";
import type { FormSettings } from "@/lib/forms/repository";

type Props = { form: FormRow; fields: FormFieldRow[] };

export function DynamicFormRenderer({ form, fields }: Props) {
  const settings = (form.settings as FormSettings) ?? {};
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(() => buildFormSchemaFromRows(fields, { server: false }), [fields]);

  const {
    register, control, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch,
  } = useForm<Record<string, unknown>>({ resolver: zodResolver(schema), defaultValues: {} });

  // Janela temporal: se o form está fora do período configurado, bloqueia o envio.
  const now = new Date();
  const before = settings.startsAt ? now < new Date(settings.startsAt) : false;
  const after = settings.endsAt ? now > new Date(settings.endsAt) : false;
  const closed = settings.acceptResponses === false || before || after;

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-primary" />
        <h2 className="font-display text-2xl font-semibold">Recebido!</h2>
        <p className="mt-2 text-muted-foreground">
          {settings.successMessage ?? "Resposta enviada com sucesso. Obrigado!"}
        </p>
        {settings.allowMultiplePerUser !== false && (
          <Button className="mt-6" onClick={() => { reset(); setSubmitted(false); }}>
            Enviar outra resposta
          </Button>
        )}
      </Card>
    );
  }

  if (closed) {
    return (
      <Card className="p-8 text-center">
        <h2 className="font-display text-xl font-semibold">Inscrições encerradas</h2>
        <p className="mt-2 text-muted-foreground">
          Este formulário não está aceitando respostas no momento.
        </p>
      </Card>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const fd = new FormData();
      fd.append("slug", form.slug);
      // Separamos arquivos e dados textuais para o backend processar.
      const flatValues: Record<string, unknown> = {};
      for (const f of fields) {
        if (isFileField(f.type as never)) {
          const files = (values[f.name] as File[] | undefined) ?? [];
          files.forEach((file) => fd.append(`file:${f.name}`, file, file.name));
        } else {
          flatValues[f.name] = values[f.name];
        }
      }
      fd.append("data", JSON.stringify(flatValues));

      const res = await fetch("/api/public/forms/submit", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro ao enviar");
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(settings.errorMessage ?? msg ?? "Erro ao enviar.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {fields.map((f) => (
        <FieldRenderer
          key={f.id}
          field={f}
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          watch={watch}
        />
      ))}
      <div className="md:col-span-2 mt-2 flex justify-end">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar"}
        </Button>
      </div>
    </form>
  );
}
