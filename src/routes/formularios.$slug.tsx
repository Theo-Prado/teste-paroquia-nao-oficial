/**
 * Página pública de exibição de um formulário dinâmico.
 * Rota: /formularios/{slug}
 * Toda a renderização vem do banco — nenhum campo é hard-coded.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Skeleton } from "@/components/ui/skeleton";
import type { FormFieldRow, FormRow } from "@/lib/forms/types";

async function loadFormBySlug(slug: string): Promise<{ form: FormRow; fields: FormFieldRow[] } | null> {
  const { data: form } = await supabase
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  if (!form) return null;
  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", form.id)
    .order("order_index", { ascending: true });
  return { form: form as FormRow, fields: (fields ?? []) as FormFieldRow[] };
}

export const Route = createFileRoute("/formularios/$slug")({
  component: PublicFormPage,
  loader: async ({ params }) => {
    const data = await loadFormBySlug(params.slug);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.form.title ?? "Formulário"} | Paróquia` },
      ...(loaderData?.form.description ? [{ name: "description", content: loaderData.form.description }] : []),
    ],
  }),
});

function PublicFormPage() {
  const { slug } = Route.useParams();
  const initial = Route.useLoaderData();
  // Reidrata via react-query para refresh leve em navegação client-side.
  const { data } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => loadFormBySlug(slug),
    initialData: initial,
  });

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          {data.form.category && (
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{data.form.category}</span>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">{data.form.title}</h1>
          {data.form.description && (
            <p className="mt-2 text-muted-foreground">{data.form.description}</p>
          )}
        </header>
        <DynamicFormRenderer form={data.form} fields={data.fields} />
      </main>
      <SiteFooter />
    </div>
  );
}
