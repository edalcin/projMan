# projMan — próximos passos

> Documento de estado. Toda sessão nova começa por aqui.
> Última atualização: 2026-09-24 (onda 1 integrada).

## Estado atual

**Fase: build do v1.** Planejamento fechado (mapa [#1](https://github.com/edalcin/projMan/issues/1)). **Onda 1 pronta** (2026-09-24): itens 1, 2, 3, 5, 6, 7, 9 e 10 do backlog. Faltam a **onda 2** (itens 4 e 8) e o item 11.

**Produção**: https://projman.dalc.in (UNRAID), com o projeto "Entre Ciências" do Vikunja. A imagem da onda 1 só chega lá quando o usuário der *force update*.

O que já existe e funciona (`npm test`: 59 testes; `npm run check`: 0 erros, 4 warnings `state_referenced_locally` benignos):

- `Dockerfile`, CI (build → Trivy → push para `ghcr.io/edalcin/projman`), template do UNRAID em `deploy/unraid/my-projMan.xml`. `README.md` é para o usuário; instalação e operação em `docs/instalacao.md`; desenvolvimento em `docs/desenvolvimento.md`.
- Schema v1 (`migrations/001_inicial.sql`) e as migrações no boot, com snapshot `.bak` antes de migrar (`src/lib/server/migrar.ts`).
- Regras de data e recorrência (`src/lib/datas.ts`); texto do prazo (`src/lib/prazo.ts`).
- Autenticação: hook, `/login`, `/logout`, sessão HMAC, rate limit. `Referrer-Policy: same-origin`.
- Shell da UI, smart lists e `GET /api/tarefas?lista=|filtro=|projeto=` (`src/lib/server/filtro.ts`).
- Projetos e labels (`/projetos`), com **link público** por projeto (criar, copiar, revogar).
- **Tarefa**: `src/lib/server/tarefas.ts` (`criarTarefa`, `marcarFeita`, `lerTarefa`, `atualizarTarefa`, `apagarTarefa`); API `POST /api/tarefas`, `GET|PATCH|DELETE /api/tarefas/<id>`, `POST /api/tarefas/<id>/feita`, `GET /api/labels`. Painel `src/lib/components/tarefa/PainelTarefa.svelte` (abre com `?tarefa=<id>` em toda página do `(app)`), `CheckFeita.svelte`, `linkTarefa.ts`, `FabNovaTarefa.svelte`. Criação rápida no topo da lista e FAB no celular. Descrição só leitura (texto).
- **Views** (`src/lib/server/views.ts`): `/projeto/<id>` (List, arrastar), `/projeto/<id>/kanban` (arrastar entre buckets; Feito ↔ `marcarFeita`), `/projeto/<id>/tabela` (`?ordem=`). Movimento em `POST /api/posicao/view` e `/api/posicao/kanban`. Na List a Subtarefa aparece solta, com o título da mãe ao lado (escondido no celular). A sidebar aponta para `/projeto/<id>`.
- **Filtros salvos** (`src/lib/server/filtros-salvos.ts`): `/filtros`, `/filtros/novo`, `/filtros/<id>` com `ConstrutorFiltro.svelte`; link na sidebar.
- **PWA**: `static/manifest.webmanifest`, `src/service-worker.ts`, reload no `controllerchange` em `src/app.html`.
- Página pública `/share/<hash>`, feed iCal `/ical/<token>`, export `/api/export`, saúde `/api/saude`.
- `scripts/seed-vikunja.py` (dados reais do Vikunja; token no `.env` local).

Ainda não existe: descrição rica (TipTap), comentários, anexos.

## Onde está a spec

| Artefato | Conteúdo |
|---|---|
| [`docs/spec.md`](spec.md) | O que o v1 faz |
| [`docs/arquitetura.md`](arquitetura.md) | C4 (Context, Container, Component) em Mermaid |
| [`docs/adr/`](adr/) | ADRs das decisões duras |
| [`CONTEXT.md`](../CONTEXT.md) | Glossário do domínio. Use estes termos no código e na UI |
| [`docs/decisoes/`](decisoes/) | Detalhe de cada ticket (#7–#17) |
| Branches `prototipo/14-shell`, `prototipo/15-filtro`, `prototipo/16-kanban` | Protótipos descartáveis: referência visual, nunca para merge |

## Como retomar

Gatilho do usuário: **"continue conforme o proximosPassos.md"**. Então execute o **Plano da próxima sessão** (seção abaixo): ele já está decomposto e com os contratos fixados. Não replaneje.

Depois de cada onda: rode `npm test`, `npm run check`, `npm run build`; faça a verificação no browser com o banco de dev (dados reais); marque ✅ nos itens; atualize "Estado atual"; commit e push na `main`. A produção só recebe a imagem nova quando o **usuário** fizer *force update* no UNRAID: avise-o.

**Regras** (valem em toda sessão):
- Uma pergunta ao usuário por vez, sempre com recomendação. O usuário autorizou assumir a recomendação sem perguntar; ele corrige depois.
- Modo `ponytail` (full): a opção que remove código ganha.
- Responda em português, com jargão técnico em inglês, frases curtas.
- Commit direto na `main`. Nunca criar branch. Nunca commitar segredo (o `.env` é ignorado; não o toque).
- Não commite trabalho pela metade: cada push na `main` gera uma imagem `latest` que o usuário pode instalar.
- Toda mudança de schema é uma migração nova (`002_…sql`); nunca edite a `001`.
- Teste de container só no Docker local; o UNRAID é só produção.
- Template do UNRAID: `deploy/unraid/my-projMan.xml` no repositório é só o modelo, sem segredo (campos sensíveis vazios, `Mask="true"`). **NUNCA copie esse arquivo por cima de `/boot/config/plugins/dockerMan/templates-user/my-projMan.xml` no servidor**: depois que o container existe, esse arquivo guarda os valores que o usuário digitou (senha, segredo, ORIGIN, caminhos). Em 2026-09-23 uma cópia apagou esses valores e o container voltou com `ORIGIN=''`. Mudou variável, porta ou volume → edite o XML do repositório, commit, e **avise o usuário** para ajustar pela UI do UNRAID (Docker → Edit). Atualizar a imagem = *Check for Updates* / *force update* na UI, feito pelo usuário. Ícone: `static/icon-512.png`.

## Plano da próxima sessão

**Onda 2** (o painel já existe). Dois agentes em paralelo, mesmo método da onda 1: cada um dono só dos seus arquivos, sem rodar `npm test`/`check`/`build` do projeto inteiro, sem commit; o Main instala as dependências **antes** de disparar (`npm i @tiptap/core @tiptap/starter-kit @tiptap/extension-link sanitize-html && npm i -D @types/sanitize-html --ignore-scripts`, confirme os pacotes no #4), recopia `.dev-wipe-me.db` para `.dev-agente{1,2}.db` e integra no fim. Screenshots de verificação vão para `C:\Users\EDalcin\Desktop\OMPtemp`.

- **Descrição** (5181 / `.dev-agente1.db`), item 4: `src/lib/server/html.ts` (sanitização com a whitelist do #4 + `description_text`) + teste; editor `src/lib/components/tarefa/EditorRico.svelte` (TipTap) usado no `PainelTarefa.svelte`; `PATCH /api/tarefas/<id>` aceita `description`. Estender `scripts/seed-vikunja.py` para trazer o HTML sanitizado.
- **Comentários e anexos** (5182 / `.dev-agente2.db`), item 8: `src/lib/server/comentarios.ts`, `src/lib/server/anexos.ts` + testes; rotas `src/routes/api/tarefas/[id]/comentarios/**`, `src/routes/api/tarefas/[id]/anexos/**`, download com `Content-Disposition`; anexo ≤25 MB em `FILES_PATH`; varredura de órfãos no boot. Comentário usa o `EditorRico.svelte` e o `html.ts` do outro agente (combinar pela mensagem `write agent://Descricao`). Seção de comentários e anexos no painel: o agente Descrição é o dono do `PainelTarefa.svelte`; o agente 2 entrega um componente `ComentariosAnexos.svelte` e o Main monta.

**Integração (Main)**: `npm test`, `npm run check`, `npm run build`; verificação no browser com os dados reais (desktop e 390 px); smoke da imagem no Docker local; commit; avisar o usuário para dar *force update*.

Depois: **item 11** (fechamento do v1). Recarregar a produção com o seed completo só se o usuário pedir, e com export antes (a produção já tem dados).

## Backlog de build (em ordem executável)

Cada item fecha completo antes do próximo. Entre parênteses, a origem.

1. ✅ **Base da UI.** Tailwind + shadcn-svelte (tema padrão, base neutra), Boxicons, fonte do sistema. Tema claro/escuro por `prefers-color-scheme` + alternância guardada em `localStorage`. Shell do #14: sidebar fixa (smart lists, projetos, filtros salvos, seção "Arquivados" recolhida, tema), drawer no celular. As smart lists leem `GET /api/tarefas` com rolagem infinita por cursor. Estados vazio, carregando (skeleton) e erro inline. (#14, #11, decisão 17) — *feito em 2026-09-23. A página de projeto hoje é a mesma lista (`/?projeto=<id>`, mostra também arquivado); vira List view no item 5. Os ícones internos dos componentes shadcn vêm de `@lucide/svelte`; os nossos são Boxicons.*
2. ✅ **Projetos e labels.** Criar, renomear, reordenar (`projects.position`), arquivar/desarquivar, apagar (físico, com confirmação). Labels globais: criar, cor, apagar. (#9) — *feito em 2026-09-23. Reordenar por botões subir/descer (renumera a lista toda, passo 1024); arrastar fica para quando o SortableJS entrar (item 6), se fizer falta. Confirmação com `confirm()` nativo.*
3. ✅ **Tarefa.** Criação rápida (campo no topo + data no desktop; FAB + folha no celular). Detalhe em painel lateral com `?tarefa=<id>` (tela cheia no celular): título, prazo (com ou sem hora), prioridade 0–5, labels, recorrência, projeto. `marcarFeita` é o ponto único que escreve `done`, move o card para o bucket de feitas e avança a recorrência (`src/lib/datas.ts`). Subtarefas em um nível. Checkbox inline otimista com rollback. (#7, #8, #14) — *feito em 2026-09-24 (onda 1). Descrição só leitura até o item 4.*
4. **Descrição rica.** TipTap no detalhe; `sanitize-html` na escrita, com a whitelist do #4; segunda passagem produz `description_text` para o FTS5. (#4, ADR 0002)
5. ✅ **List e Table.** Ordenação manual por view (`task_positions`): `entre(antes, depois)`, passo 1024, renumeração abaixo de 0,01, calculada no servidor. Table com colunas fixas. Ordenação e filtro de view na URL. (#7, #16, ADR 0001)
6. ✅ **Kanban.** Três buckets por projeto, SortableJS (`forceFallback`, `delay: 250` só no toque). `PATCH` de mover: `{ bucket_id, antes, depois }`; o servidor calcula a posição e renumera a coluna. Mover para o bucket de feitas = `marcarFeita`, e sair dele reabre. O WIP só sinaliza. (#7, #16)
7. ✅ **Filtros salvos.** CRUD com o construtor do #15 (formulário numa coluna, label com tem/não tem, "sem label alguma", "criada há mais de"). Toda escrita e leitura passa por `parseFiltro`. (#11, #15)
8. **Comentários e anexos.** Comentário com o mesmo TipTap e a mesma sanitização. Anexo até 25 MB em `FILES_PATH`, metadados em `attachments`, download com `Content-Disposition`. Varredura de órfãos no boot. (#9, #12, ADR 0005)
9. ✅ **Link público.** Criar e revogar na UI do projeto (a rota `/share/<hash>` já existe). (#10)
10. ✅ **PWA.** `src/service-worker.ts` nativo (cache-first nos assets, network-first no resto, mutação nunca cacheada), manifest com ícones 192/512 + maskable, reload no `controllerchange`. (#5, ADR 0004)
11. **Fechamento do v1.** Smoke test da imagem no Docker local, com todos os fluxos. README e template revistos. Tag de release.

**Depois do v1** (fora): Web Push, Gantt (+ `blocked_by`), multiusuário, OR no filtro, favoritos de projeto, i18n.

## Armadilhas

- **`DB_PATH`**: o recomendado é o pool físico (`/mnt/cache/...`), porque o FUSE (`/mnt/user/...`) não entrega a memória compartilhada que o WAL exige. **A produção usa `/mnt/user/Storage/...` por decisão do usuário** (ver "Fatos do ambiente"); não reabra o assunto.
- **Referrer-Policy**: nunca `no-referrer` (o browser manda `Origin: null` e o CSRF do SvelteKit barra todo formulário). Use `same-origin`. `curl` com `Origin` à mão não pega esse bug: teste login no browser real.
- **`ORIGIN` e `ADDRESS_HEADER=CF-Connecting-IP`** são requisito: sem eles o SvelteKit rejeita todo POST atrás do Cloudflare Tunnel com 403.
- **Build**: `better-sqlite3` roda o `node-gyp` por causa do `binding.gyp`, e no Alpine isso falha. O `Dockerfile` e o CI usam `npm ci --ignore-scripts`. Não remova.
- **O container exige** `ADMIN_PASSWORD_HASH` (gere com `node scripts/hash-senha.ts`) e `SESSION_SECRET` (`openssl rand -base64 48`). Sem eles o processo sai no boot, de propósito.
- **Instantes** só no formato de `Date.toISOString()` (o `CHECK` do banco impõe): comparar ISO como texto só funciona com um formato.

### Dados de teste (reais)

O banco de dev (`.dev-wipe-me.db`, ignorado pelo git) usa o projeto **"Entre Ciências"** do Vikunja do usuário (`https://vikunja.dalc.in`): 59 tarefas, 14 subtarefas, 5 labels, prazos em 2027–2028 (as smart lists Hoje/7 dias/Atrasadas ficam vazias; "Sem prazo" tem 35). Para recriar:

```sh
python scripts/seed-vikunja.py "Entre Ciências" .dev-wipe-me.db --substituir
```

`VIKUNJA_URL` e `VIKUNJA_TOKEN` estão no **`.env` local** (ignorado pelo git; o `.env.example` só tem placeholders). Nunca commite o `.env`. O script só lê a API (GET) e cria o banco do zero; um banco que já existe só é trocado com `--substituir`. Ficam de fora comentários, anexos e o HTML da descrição (só o texto vai para `description_text`); estenda quando os itens 4 e 8 estiverem prontos. Sem `User-Agent` o Cloudflare do Vikunja responde 403. No Windows, pare o dev server antes: arquivo aberto não pode ser apagado.

**Carga na produção** (pedido do usuário; faça só quando ele pedir): gere `projman.db` nesta máquina com o script; no UNRAID pare o container, copie o arquivo para `/mnt/cache/appdata/projman/projman.db` (apague `projman.db-wal`/`-shm` antigos), acerte o dono (`chown 99:100`) e suba o container. O banco antigo da produção é substituído: faça antes um export (`/api/export`) ou deixe o Appdata Backup rodar.

### Armadilhas de teste

- **Smoke test da imagem**: `docker build` + `docker run` local, com volume (`-v projman-testdata:/data`), `TZ`, `ORIGIN`, `ADDRESS_HEADER`, `ADMIN_PASSWORD_HASH` e `SESSION_SECRET`. Remova o container e o volume no fim.
- **Dev server sem login**: `ADMIN_PASSWORD_HASH=scrypt:x` basta para o boot. Cookie à mão: `sessao=<expira ms>.<base64url(HMAC-SHA256(SESSION_SECRET, expira))>`.
- **Form action do SvelteKit** sem `Accept: text/html` responde JSON 200, e não 303.
- **`tsc --noEmit`** acusa `./$types` até rodar `svelte-kit sync` (o `npm run build` já roda).
- **Módulo de servidor com efeito no import** precisa do guarda `building` de `$app/environment`.
- **Python no Windows**: grave seed com `encoding='utf-8'`; `subprocess(shell=True)` usa `cmd.exe`.
- **Export**: `VACUUM INTO` grava em `tmpdir()`; `/tmp` do container deve ficar vazio depois do download.
- **Browser de verificação (relay)**: é uma aba só, compartilhada por todos os subagentes: em paralelo eles se atropelam; o Main verifica no fim. Screenshot sai em `~/Desktop`: mova para `~/Desktop/OMPtemp`. Arrastar com SortableJS funciona com `page.mouse` (down, moves em passos, up) mirando o `ul[data-bucket]`; coluna fora da tela não recebe o drop (role o contêiner antes).
- **Browser (emulação)**: com `emulate({ device })`, `tab.click` por coordenada pode acertar o elemento errado. Use `evaluate("el.click()")` ou teste sem emulação.
- **Vite no Windows**: `localhost` resolve para `::1`; a checagem de porta do `hub` espera `127.0.0.1`. Suba com `--host 127.0.0.1`.

## Fatos do ambiente

- **UNRAID**: `root@192.168.1.10`, chave `C:/Users/EDalcin/.ssh/unraid_ed25519`. Templates em `/boot/config/plugins/dockerMan/templates-user/` (prefixo `my-`).
- **Volumes em produção (decisão do usuário, 2026-09-23)**: banco em `/mnt/user/Storage/appsdata/projman/db/projman.db` (share do array, disk2), anexos em `/mnt/user/Storage/appsdata/projman/files`. O usuário conhece o risco do WAL no FUSE e escolheu assim; não reabra o assunto. Backup (Appdata Backup ou `/api/export`) deve cobrir esse caminho.
- **Carga feita em 2026-09-23 19:37**: produção recebeu "Entre Ciências" do Vikunja (59 tarefas, 14 subtarefas, 5 labels). O banco vazio anterior ficou em `.../projman/db/antes-da-carga/`. Depois dessa data a produção tem dados reais: não rode o script contra ela de novo sem export antes.
- **Porta: 8426.**
- **Local**: Node v22.23.0, npm 10.9.8, Docker 29.1.3.

## Stack fixado (por `AGENTS.md`)

SvelteKit + shadcn-svelte, Boxicons, TipTap, SQLite em `DB_PATH`, PWA, tema claro/escuro, rolagem infinita (nunca paginação), Docker em `ghcr.io/edalcin/projman`, GitHub Actions com tags `latest` + SHA curto, container não-root, documentação em Markdown, diagramas em Mermaid, arquitetura em C4.
