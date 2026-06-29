/**
 * Construtor visual de formulários (admin).
 * - Editor de metadados (título, slug, status, mensagens, janela e limites)
 * - Paleta de tipos de campo para adicionar novos campos
 * - Lista de campos com Drag and Drop (dnd-kit)
 * - Painel lateral (Sheet) para editar propriedades do campo selecionado
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Save, Eye, ArrowLeft, Pencil } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { makeSlug } from "@/lib/utils";
import { formsRepository, type FormSettings, rowToSettings } from "@/lib/forms/repository";
import {
  FIELD_TYPE_CATALOG, FIELD_TYPE_META, isFileField, isLayoutField,
  type BuilderField, type FieldType,
} from "@/lib/forms/types";

export const Route = createFileRoute("/_authenticated/admin/formularios/$id")({
  component: FormEditor,
});

// ---------- Helpers ----------

/** Gera um BuilderField padrão para um tipo. */
function createField(type: FieldType, order: number): BuilderField {
  const meta = FIELD_TYPE_META[type];
  const baseName = `campo_${order + 1}`;
  return {
    type,
    name: baseName,
    label: meta.label,
    required: false,
    width: "100",
    order_index: order,
    options: meta.hasOptions ? [{ label: "Opção 1", value: "opcao_1" }] : [],
    validation: {},
    file_config: meta.isFile
      ? { accept: type === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["application/pdf", "image/jpeg", "image/png"], maxSizeMb: 10, maxFiles: 1 }
      : {},
  };
}

// ---------- Sortable card ----------

function SortableFieldCard({
  field, index, onEdit, onRemove,
}: { field: BuilderField; index: number; onEdit: () => void; onRemove: () => void }) {
  const id = field.id ?? `tmp-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border border-border bg-card p-3 flex items-center gap-3">
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Reordenar">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.label || field.name}</span>
          <Badge variant="outline" className="text-[10px]">{FIELD_TYPE_META[field.type].label}</Badge>
          {field.required && <Badge variant="secondary" className="text-[10px]">Obrig.</Badge>}
          <Badge variant="outline" className="text-[10px]">{field.width}%</Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">{field.name}</div>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Editar campo"><Pencil className="h-4 w-4" /></Button>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Excluir campo"><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}

// ---------- Editor de propriedades do campo ----------

function FieldPropertiesEditor({
  field, onChange,
}: { field: BuilderField; onChange: (next: BuilderField) => void }) {
  const set = <K extends keyof BuilderField>(k: K, v: BuilderField[K]) => onChange({ ...field, [k]: v });
  const setValidation = (patch: Partial<BuilderField["validation"]>) =>
    onChange({ ...field, validation: { ...field.validation, ...patch } });
  const setFileCfg = (patch: Partial<BuilderField["file_config"]>) =>
    onChange({ ...field, file_config: { ...field.file_config, ...patch } });

  const meta = FIELD_TYPE_META[field.type];

  return (
    <Tabs defaultValue="geral" className="mt-4">
      <TabsList className="w-full">
        <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
        {meta.hasOptions && <TabsTrigger value="opcoes" className="flex-1">Opções</TabsTrigger>}
        <TabsTrigger value="validacao" className="flex-1">Validação</TabsTrigger>
        {meta.isFile && <TabsTrigger value="arquivo" className="flex-1">Arquivo</TabsTrigger>}
      </TabsList>

      <TabsContent value="geral" className="space-y-3 pt-4">
        <div>
          <Label>Rótulo</Label>
          <Input value={field.label} onChange={(e) => set("label", e.target.value)} />
        </div>
        <div>
          <Label>Nome interno</Label>
          <Input value={field.name} onChange={(e) => set("name", makeSlug(e.target.value).replace(/-/g, "_"))} />
          <p className="mt-1 text-xs text-muted-foreground">Usado nas exportações. Apenas letras, números e underscore.</p>
        </div>
        {!isLayoutField(field.type) && (
          <>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea rows={2} value={field.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <Label>Placeholder</Label>
              <Input value={field.placeholder ?? ""} onChange={(e) => set("placeholder", e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`req-${field.name}`}>Obrigatório</Label>
              <Switch id={`req-${field.name}`} checked={field.required} onCheckedChange={(c) => set("required", c)} />
            </div>
          </>
        )}
        <div>
          <Label>Largura</Label>
          <Select value={field.width} onValueChange={(v) => set("width", v as "50" | "100")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      {meta.hasOptions && (
        <TabsContent value="opcoes" className="space-y-3 pt-4">
          {field.options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Rótulo"
                value={o.label}
                onChange={(e) => {
                  const next = [...field.options];
                  next[i] = { ...o, label: e.target.value, value: o.value || makeSlug(e.target.value).replace(/-/g, "_") };
                  set("options", next);
                }}
              />
              <Input
                placeholder="Valor"
                value={o.value}
                onChange={(e) => {
                  const next = [...field.options];
                  next[i] = { ...o, value: e.target.value };
                  set("options", next);
                }}
              />
              <Button type="button" variant="ghost" size="icon"
                onClick={() => set("options", field.options.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => set("options", [...field.options, { label: `Opção ${field.options.length + 1}`, value: `opcao_${field.options.length + 1}` }])}>
            <Plus className="mr-2 h-3 w-3" /> Adicionar opção
          </Button>
        </TabsContent>
      )}

      <TabsContent value="validacao" className="space-y-3 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Mín. caracteres</Label>
            <Input type="number" value={field.validation.minLength ?? ""}
              onChange={(e) => setValidation({ minLength: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label>Máx. caracteres</Label>
            <Input type="number" value={field.validation.maxLength ?? ""}
              onChange={(e) => setValidation({ maxLength: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label>Valor mínimo</Label>
            <Input type="number" value={field.validation.min ?? ""}
              onChange={(e) => setValidation({ min: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label>Valor máximo</Label>
            <Input type="number" value={field.validation.max ?? ""}
              onChange={(e) => setValidation({ max: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>
        <div>
          <Label>Regex (opcional)</Label>
          <Input value={field.validation.regex ?? ""}
            onChange={(e) => setValidation({ regex: e.target.value || undefined })} />
        </div>
        <div>
          <Label>Mensagem de erro</Label>
          <Input value={field.validation.message ?? ""}
            onChange={(e) => setValidation({ message: e.target.value || undefined })} />
        </div>
      </TabsContent>

      {meta.isFile && (
        <TabsContent value="arquivo" className="space-y-3 pt-4">
          <div>
            <Label>Tipos aceitos (MIME, separados por vírgula)</Label>
            <Input
              value={(field.file_config.accept ?? []).join(",")}
              onChange={(e) => setFileCfg({ accept: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ex: application/pdf, image/jpeg, image/png, application/msword,
              application/vnd.openxmlformats-officedocument.wordprocessingml.document
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tamanho máx. (MB)</Label>
              <Input type="number" value={field.file_config.maxSizeMb ?? 10}
                onChange={(e) => setFileCfg({ maxSizeMb: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Qtd. máx. de arquivos</Label>
              <Input type="number" value={field.file_config.maxFiles ?? 1}
                onChange={(e) => setFileCfg({ maxFiles: Number(e.target.value) })} />
            </div>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

// ---------- Página principal ----------

function FormEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-form", id],
    queryFn: () => formsRepository.getAdminById(id),
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"rascunho" | "publicado" | "arquivado">("rascunho");
  const [settings, setSettings] = useState<FormSettings>({});
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Hidrata estado quando a query carrega
  useEffect(() => {
    if (!data) return;
    setTitle(data.form.title);
    setSlug(data.form.slug);
    setDescription(data.form.description ?? "");
    setCategory(data.form.category ?? "");
    setStatus(data.form.status as never);
    setSettings(rowToSettings(data.form));
    setFields(
      data.fields.map((r, i) => ({
        id: r.id,
        type: r.type as FieldType,
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
      })),
    );
  }, [data]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof FIELD_TYPE_CATALOG> = {};
    for (const t of FIELD_TYPE_CATALOG) {
      (groups[t.group] ??= [] as never).push(t);
    }
    return groups;
  }, []);

  const addField = (type: FieldType) => {
    setFields((prev) => [...prev, createField(type, prev.length)]);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const ids = prev.map((f, i) => f.id ?? `tmp-${i}`);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to).map((f, i) => ({ ...f, order_index: i }));
    });
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Título é obrigatório."); return; }
    if (!slug.trim()) { toast.error("Slug é obrigatório."); return; }
    // Garante nomes únicos antes de salvar
    const names = new Set<string>();
    for (const f of fields) {
      if (!f.name) { toast.error(`Campo "${f.label}" sem nome interno.`); return; }
      if (names.has(f.name)) { toast.error(`Nome interno duplicado: ${f.name}`); return; }
      names.add(f.name);
    }
    setSaving(true);
    try {
      await formsRepository.upsertForm({
        id, title, slug: makeSlug(slug),
        description: description || null,
        category: category || null,
        status, settings,
      });
      await formsRepository.replaceFields(id, fields);
      toast.success("Formulário salvo.");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <AdminLayout title="Editor"><p className="text-muted-foreground">Carregando...</p></AdminLayout>;
  }

  const editingField = editingIdx != null ? fields[editingIdx] : null;

  return (
    <AdminLayout title={title || "Editor de formulário"}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/formularios" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/formularios/$slug" params={{ slug }} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" /> Visualizar</Link>
        </Button>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
        {/* ---------- Coluna esquerda: paleta ---------- */}
        <aside>
          <Card className="p-4">
            <h3 className="font-display text-sm font-semibold mb-3">Adicionar campo</h3>
            <div className="space-y-3">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{group}</p>
                  <div className="flex flex-wrap gap-1">
                    {items.map((t) => (
                      <Button key={t.type} type="button" variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => addField(t.type)}>
                        <Plus className="mr-1 h-3 w-3" /> {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>

        {/* ---------- Coluna central: lista de campos ---------- */}
        <section>
          <Card className="p-4">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Adicione campos pela paleta à esquerda. Arraste pelos pontos para reordenar.
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={fields.map((f, i) => f.id ?? `tmp-${i}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {fields.map((f, i) => (
                      <SortableFieldCard
                        key={f.id ?? `tmp-${i}`}
                        field={f} index={i}
                        onEdit={() => setEditingIdx(i)}
                        onRemove={() => setFields((prev) => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        </section>

        {/* ---------- Coluna direita: configurações ---------- */}
        <aside className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold">Identificação</h3>
            <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(makeSlug(e.target.value))} />
              <p className="mt-1 text-xs text-muted-foreground">URL pública: /formularios/{slug}</p>
            </div>
            <div><Label>Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold">Comportamento</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="accept">Aceitar respostas</Label>
              <Switch id="accept" checked={settings.acceptResponses ?? true}
                onCheckedChange={(c) => setSettings((s) => ({ ...s, acceptResponses: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="multi">Múltiplas respostas do mesmo usuário</Label>
              <Switch id="multi" checked={settings.allowMultiplePerUser ?? true}
                onCheckedChange={(c) => setSettings((s) => ({ ...s, allowMultiplePerUser: c }))} />
            </div>
            <div><Label>Mensagem de sucesso</Label>
              <Textarea rows={2} value={settings.successMessage ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, successMessage: e.target.value }))} />
            </div>
            <div><Label>Mensagem de erro</Label>
              <Textarea rows={2} value={settings.errorMessage ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, errorMessage: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data inicial</Label>
                <Input type="datetime-local" value={settings.startsAt?.slice(0, 16) ?? ""}
                  onChange={(e) => setSettings((s) => ({ ...s, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
              </div>
              <div><Label>Data final</Label>
                <Input type="datetime-local" value={settings.endsAt?.slice(0, 16) ?? ""}
                  onChange={(e) => setSettings((s) => ({ ...s, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
              </div>
            </div>
            <div>
              <Label>Limite de respostas</Label>
              <Input type="number" placeholder="Sem limite" value={settings.responseLimit ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, responseLimit: e.target.value ? Number(e.target.value) : null }))} />
            </div>
          </Card>
        </aside>
      </div>

      {/* ---------- Sheet de edição do campo selecionado ---------- */}
      <Sheet open={editingField != null} onOpenChange={(o) => !o && setEditingIdx(null)}>
        <SheetTrigger asChild><span /></SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar campo</SheetTitle>
          </SheetHeader>
          {editingField && (
            <FieldPropertiesEditor
              field={editingField}
              onChange={(next) => {
                setFields((prev) => prev.map((f, i) => (i === editingIdx ? next : f)));
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
