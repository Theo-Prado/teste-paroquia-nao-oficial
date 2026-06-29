## Construtor de Formulários Dinâmicos

Módulo completo de formulários personalizáveis integrado ao CMS existente, seguindo os padrões já estabelecidos (TanStack Start, Supabase/Lovable Cloud, shadcn/ui, TipTap, AdminLayout).

### 1. Banco de dados (migração única)

Tabelas em `public`:

- **`forms`** — `id, title, slug (unique), description, category, status ('draft'|'published'|'archived'), active, success_message, error_message, accept_submissions, allow_multiple, start_at, end_at, submission_limit (nullable), created_by, created_at, updated_at`
- **`form_fields`** — `id, form_id (fk cascade), type, name (interno), label, description, placeholder, required, width ('50'|'100'), order_index, options (jsonb — para select/radio/checkbox), validation (jsonb — min/max/length/regex/message), file_config (jsonb — extensões, tamanho, qtd)`
- **`form_submissions`** — `id, form_id (fk), user_id (nullable), ip, user_agent, status ('new'|'read'|'archived'), created_at`
- **`form_answers`** — `id, submission_id (fk cascade), field_id (fk), value (jsonb)`

Índices: `forms(slug)`, `form_fields(form_id, order_index)`, `form_submissions(form_id, created_at desc)`, `form_answers(submission_id)`.

**RLS + GRANTs:**
- `forms`: SELECT público só de `status='published' AND active=true`; CRUD para staff (via `private.is_staff`)
- `form_fields`: SELECT público quando o formulário pai está publicado; CRUD staff
- `form_submissions` / `form_answers`: INSERT público (com `WITH CHECK` validando que o form aceita submissões, dentro da janela, sem ultrapassar limite — via função SECURITY DEFINER); SELECT/DELETE só staff
- Bucket `media` reutilizado: uploads vão para `forms/{form_id}/{submission_id}/{uuid}-{filename}`

### 2. Backend (server functions + server route)

Em `src/lib/forms/`:

- `forms.repository.ts` — acesso puro ao Supabase (queries CRUD)
- `forms.service.ts` — regras de negócio (slug único, validação de janela/limite, montagem do schema de validação)
- `forms.dto.ts` — Zod schemas (FormDTO, FieldDTO, SubmissionDTO)
- `forms.validators.ts` — gerador dinâmico de schema Zod por campo (tipo + validação)
- `forms.functions.ts` — `createServerFn`:
  - Admin (`requireSupabaseAuth` + checagem de `is_staff`): `listForms`, `getForm`, `upsertForm` (form + campos transacional), `duplicateForm`, `deleteForm`, `publishForm`, `listSubmissions`, `getSubmission`, `deleteSubmission(s)`, `exportSubmissions(csv|xlsx)`
  - Público: `getPublicFormBySlug`, `submitForm` (valida tudo no backend, persiste submission + answers, faz upload de arquivos)

Server route público:
- `src/routes/api/public/forms.$slug.submit.ts` — POST multipart (uploads), valida MIME/tamanho, gera nomes únicos (uuid), salva em storage, chama service. Rate-limit ad-hoc por IP+slug em tabela `form_submission_attempts` (janela 1 min, máx 5) — apenas se você confirmar; caso contrário, omito (ver Riscos).

### 3. Frontend — Painel admin

Novas rotas sob `_authenticated/admin/`:

- `_authenticated.admin.formularios.index.tsx` — lista com busca, filtros, ações (editar, duplicar, publicar, arquivar, excluir)
- `_authenticated.admin.formularios.novo.tsx` — atalho para o construtor em modo "novo"
- `_authenticated.admin.formularios.$id.tsx` — construtor visual:
  - Aba "Configurações" (título, slug, descrição, categoria, status, mensagens, janela, limites)
  - Aba "Campos" — drag-and-drop (`@dnd-kit/core` + `sortable`), painel lateral com tipos disponíveis, editor inline por campo (rótulo, nome, placeholder, obrigatório, largura, validação, opções, config de upload)
  - Botão "Pré-visualizar" abre dialog renderizando o form com o mesmo renderer público
- `_authenticated.admin.formularios.respostas.tsx` — listagem com filtros (formulário, período, busca), tabela, dialog "Ver resposta", exportação CSV/XLSX, exclusão em massa
- `_authenticated.admin.formularios.respostas.$id.tsx` — detalhe da submissão (campos na ordem, links para arquivos)

Adicionar entrada "Formulários" no `admin-layout.tsx` (entre Mensagens e Arquivos).

Dashboard (`_authenticated.admin.index.tsx`): adicionar cards "Formulários ativos", "Respostas (30d)", "Mais respondido", "Última resposta".

### 4. Frontend — Página pública

- `src/routes/formularios.$slug.tsx` — SSR público; loader chama `getPublicFormBySlug` (server fn pública, sem auth); renderiza via `<DynamicFormRenderer />`
- `src/components/forms/dynamic-form-renderer.tsx` — recebe form+campos, monta schema Zod dinâmico via `forms.validators.ts`, usa `react-hook-form`, renderiza cada tipo de campo via `<FieldRenderer />`
- `src/components/forms/field-renderer.tsx` — switch por tipo, usando componentes shadcn (Input, Textarea, Select, RadioGroup, Checkbox, Calendar, etc.). Suporte para máscaras (CPF/RG/CEP/Telefone) via formatadores leves.
- `src/components/forms/file-upload-field.tsx` — input multipart com preview, valida MIME/tamanho client-side
- Estados: loading, sucesso (exibe `success_message`), erro (exibe `error_message`), bloqueio (form inativo / fora da janela / limite atingido / já respondeu quando `allow_multiple=false`)

### 5. Construtor visual — componentes

Em `src/components/forms/builder/`:
- `field-palette.tsx` — lista de tipos arrastáveis
- `field-canvas.tsx` — área drop com `SortableContext`
- `field-editor.tsx` — formulário lateral de edição do campo selecionado
- `options-editor.tsx` — CRUD inline das opções (select/radio/checkbox) com drag
- `field-preview.tsx` — pré-visualização do campo

### 6. Tipos de campo suportados

text, textarea, email, tel, cpf, rg, cep, city, state, address, number_int, number_decimal, date, time, datetime, select, radio, checkbox, file, image, url, password, hidden, heading, separator, info. Cada um mapeado a um renderer + validador Zod base.

### 7. Permissões

Usar `private.has_role` já existente. Reutilizar `is_staff` para painel. Não adicionar novos roles agora — staff já cobre CRUD/respostas. (Caso queira granularidade `forms.publish` etc., posso adicionar uma tabela `role_permissions` numa segunda etapa.)

### 8. Segurança

- Validação Zod no backend espelha o schema dinâmico do form
- Sanitização de strings (`.trim()`, limites de tamanho)
- Uploads: whitelist de MIME + extensão, limite de tamanho por config, nomes via `crypto.randomUUID()`
- RLS bloqueia leitura de submissões por não-staff
- Submissão pública passa pelo server route `/api/public/...` (já fora do auth gate); valida tudo server-side
- Logs de auditoria em `logs` (tabela existente) para create/update/delete de forms e exclusão de respostas

### 9. Dependências a adicionar

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — drag-and-drop
- `xlsx` — exportação Excel
- `react-hook-form` + `@hookform/resolvers` (verificar se já está; o `form.tsx` shadcn usa)

### 10. Fora de escopo desta entrega (peço confirmação se quiser incluir)

- **Exportação PDF** — adiciona dependência pesada; sugiro fazer via "imprimir página de detalhe" usando CSS de impressão ou deixar para próxima etapa
- **Rate limiting persistente** — backend não tem primitiva padrão (ver constraint do projeto); posso implementar tabela ad-hoc se você confirmar
- **CSRF token explícito** — submissões usam mesma origem + validação server-side; CSRF token formal só se necessário
- **Cache de formulários públicos** — adicionar headers `Cache-Control` no loader, suficiente sem infra extra
- **Sistema granular de permissões por ação** — staff cobre tudo agora; adicionar permissões finas requer nova tabela

### Riscos

- Migração grande (4 tabelas + policies + função SECURITY DEFINER de validação). Sem impacto em tabelas existentes.
- Construtor visual é a parte mais complexa (drag-and-drop aninhado, edição inline). Vou manter componentes pequenos e testáveis.
- Bucket `media` já é público; arquivos de formulário ficarão acessíveis por URL. Se quiser sigilo (ex: CPF anexado), precisa bucket privado separado — confirme.

### Perguntas antes de implementar

1. **Exportação PDF**: incluir agora (com `jspdf`/`pdfmake`) ou deixar para depois?
2. **Rate limiting**: implementar tabela ad-hoc agora ou pular?
3. **Bucket privado** para anexos de formulários (recomendado para dados sensíveis tipo dizimistas/casamento) ou usar o `media` público existente?
4. **Granularidade de permissões**: staff cobre tudo (mais simples) ou criar permissões finas por ação?
