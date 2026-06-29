/**
 * Rota "Novo formulário": cria um rascunho mínimo e redireciona para o editor.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { formsRepository } from "@/lib/forms/repository";
import { makeSlug } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/formularios/novo")({
  loader: async () => {
    const slug = `novo-formulario-${Date.now().toString(36)}`;
    const id = await formsRepository.upsertForm({
      title: "Novo formulário",
      slug: makeSlug(slug),
      status: "rascunho",
      settings: {},
    });
    throw redirect({ to: "/admin/formularios/$id", params: { id } });
  },
});
