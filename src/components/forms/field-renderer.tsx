/**
 * Componente que renderiza um único campo do formulário dinâmico.
 * Recebe o registro do campo (vindo do banco) e o objeto de controle do
 * react-hook-form. Toda a presença e formato dos inputs é decidida por `type`.
 */
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isFileField, isLayoutField, rowToBuilderField, type FormFieldRow } from "@/lib/forms/types";
import { maskCEP, maskCPF, maskTel, maskRG, UF_LIST } from "@/lib/forms/format";

type Props = {
  field: FormFieldRow;
  register: UseFormRegister<Record<string, unknown>>;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
};

export function FieldRenderer({ field, register, control, errors, setValue, watch }: Props) {
  const f = rowToBuilderField(field);
  const error = errors[f.name] as { message?: string } | undefined;
  const widthClass = f.width === "50" ? "md:col-span-1" : "md:col-span-2";

  // Layout puro
  if (isLayoutField(f.type)) {
    if (f.type === "heading") {
      return (
        <div className={cn("md:col-span-2", widthClass)}>
          <h3 className="font-display text-xl font-semibold">{f.label}</h3>
          {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
        </div>
      );
    }
    if (f.type === "separator") return <hr className="md:col-span-2 my-2 border-border" />;
    return (
      <div className={cn("md:col-span-2 rounded-md border border-border bg-muted/30 p-3 text-sm", widthClass)}>
        {f.label && <p className="font-medium">{f.label}</p>}
        {f.description && <p className="text-muted-foreground">{f.description}</p>}
      </div>
    );
  }

  // Campo oculto: renderiza só o input, sem label
  if (f.type === "hidden") {
    return <input type="hidden" {...register(f.name)} />;
  }

  const labelEl = (
    <Label htmlFor={f.name} className="flex items-center gap-1">
      {f.label}
      {f.required && <span className="text-destructive" aria-hidden>*</span>}
    </Label>
  );

  // Helpers de máscara
  const masked = (mask: (v: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(f.name, mask(e.target.value), { shouldValidate: true });
  };

  const renderInput = () => {
    switch (f.type) {
      case "textarea":
        return <Textarea id={f.name} placeholder={f.placeholder} rows={4} {...register(f.name)} />;
      case "email":
        return <Input id={f.name} type="email" placeholder={f.placeholder} {...register(f.name)} />;
      case "url":
        return <Input id={f.name} type="url" placeholder={f.placeholder} {...register(f.name)} />;
      case "password":
        return <Input id={f.name} type="password" placeholder={f.placeholder} {...register(f.name)} />;
      case "tel": {
        const value = (watch(f.name) as string) ?? "";
        return <Input id={f.name} inputMode="tel" placeholder={f.placeholder ?? "(00) 00000-0000"} value={value} onChange={masked(maskTel)} />;
      }
      case "cpf": {
        const value = (watch(f.name) as string) ?? "";
        return <Input id={f.name} inputMode="numeric" placeholder={f.placeholder ?? "000.000.000-00"} value={value} onChange={masked(maskCPF)} />;
      }
      case "cep": {
        const value = (watch(f.name) as string) ?? "";
        return <Input id={f.name} inputMode="numeric" placeholder={f.placeholder ?? "00000-000"} value={value} onChange={masked(maskCEP)} />;
      }
      case "rg": {
        const value = (watch(f.name) as string) ?? "";
        return <Input id={f.name} placeholder={f.placeholder} value={value} onChange={masked(maskRG)} />;
      }
      case "state":
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field: ctl }) => (
              <Select value={(ctl.value as string) ?? ""} onValueChange={ctl.onChange}>
                <SelectTrigger id={f.name}><SelectValue placeholder={f.placeholder ?? "Selecione a UF"} /></SelectTrigger>
                <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
              </Select>
            )}
          />
        );
      case "number_int":
        return <Input id={f.name} type="number" step={1} placeholder={f.placeholder} {...register(f.name)} />;
      case "number_decimal":
        return <Input id={f.name} type="number" step="any" placeholder={f.placeholder} {...register(f.name)} />;
      case "date":
        return <Input id={f.name} type="date" {...register(f.name)} />;
      case "time":
        return <Input id={f.name} type="time" {...register(f.name)} />;
      case "datetime":
        return <Input id={f.name} type="datetime-local" {...register(f.name)} />;
      case "select":
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field: ctl }) => (
              <Select value={(ctl.value as string) ?? ""} onValueChange={ctl.onChange}>
                <SelectTrigger id={f.name}><SelectValue placeholder={f.placeholder ?? "Selecione"} /></SelectTrigger>
                <SelectContent>{f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            )}
          />
        );
      case "radio":
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field: ctl }) => (
              <RadioGroup value={(ctl.value as string) ?? ""} onValueChange={ctl.onChange} className="flex flex-col gap-2">
                {f.options.map((o) => (
                  <div key={o.value} className="flex items-center gap-2">
                    <RadioGroupItem value={o.value} id={`${f.name}-${o.value}`} />
                    <Label htmlFor={`${f.name}-${o.value}`} className="font-normal">{o.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        );
      case "checkbox":
        return (
          <Controller
            control={control}
            name={f.name}
            defaultValue={[]}
            render={({ field: ctl }) => {
              const current = (ctl.value as string[]) ?? [];
              return (
                <div className="flex flex-col gap-2">
                  {f.options.map((o) => {
                    const checked = current.includes(o.value);
                    return (
                      <div key={o.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${f.name}-${o.value}`}
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...current, o.value]
                              : current.filter((v) => v !== o.value);
                            ctl.onChange(next);
                          }}
                        />
                        <Label htmlFor={`${f.name}-${o.value}`} className="font-normal">{o.label}</Label>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
        );
      case "file":
      case "image": {
        const accept = (f.file_config?.accept ?? (f.type === "image" ? ["image/*"] : [])).join(",");
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field: ctl }) => (
              <Input
                id={f.name}
                type="file"
                accept={accept || undefined}
                multiple={(f.file_config?.maxFiles ?? 1) > 1}
                onChange={(e) => ctl.onChange(Array.from(e.target.files ?? []))}
              />
            )}
          />
        );
      }
      default:
        return <Input id={f.name} type="text" placeholder={f.placeholder} {...register(f.name)} />;
    }
  };

  return (
    <div className={cn("md:col-span-2 space-y-1.5", widthClass)}>
      {labelEl}
      {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
      {renderInput()}
      {error?.message && <p className="text-xs text-destructive">{String(error.message)}</p>}
    </div>
  );
}
