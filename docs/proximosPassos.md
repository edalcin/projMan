# projMan — próximos passos

> Documento de estado. Toda sessão nova começa por aqui.
> Última atualização: 2026-09-23 (fim de sessão, encerrada pelo usuário para esperar os créditos).

## Estado atual

**Fase: build do v1.** Planejamento fechado (mapa [#1](https://github.com/edalcin/projMan/issues/1)). Itens 1 e 2 do backlog prontos. O **núcleo do item 3** também está pronto (ver abaixo). O resto dos itens 3–11 **não foi começado**: os 4 subagentes que iam fazê-los em paralelo foram parados na fase de leitura, sem escrever código. O working tree está limpo e a `main` sincronizada.

**Produção no ar**: https://projman.dalc.in (UNRAID, login funcionando desde o fix do `Referrer-Policy`, commit `a49e923`), com o projeto "Entre Ciências" carregado do Vikunja. O usuário **vê só uma lista "flat"**: não dá para abrir tarefa, marcar feita, nem ver Kanban. Essa é a queixa a resolver primeiro.

O que já existe e funciona (`npm test`: 38 testes):

- `Dockerfile`, CI (build → Trivy → push para `ghcr.io/edalcin/projman`), template do UNRAID em `deploy/unraid/my-projMan.xml`, README com instalação, backup, atualização e acesso só pela URL do `ORIGIN`.
- Schema v1 (`migrations/001_inicial.sql`) e as migrações no boot, com snapshot `.bak` antes de migrar (`src/lib/server/migrar.ts`).
- Regras de data e recorrência (`src/lib/datas.ts`); texto do prazo (`src/lib/prazo.ts`).
- Autenticação: hook, `/login` (visual novo), `/logout`, sessão HMAC, rate limit. `Referrer-Policy: same-origin` (com `no-referrer` o browser mandava `Origin: null` e o CSRF barrava o login).
- Smart lists, filtro salvo e lista por projeto: `resolverFiltro` + `listarTarefas` (`src/lib/server/filtro.ts`), `GET /api/tarefas?lista=|filtro=|projeto=`.
- **Shell da UI** (item 1) e **Projetos e labels** (item 2, página `/projetos`).
- **Núcleo do item 3** (commit `7b152c2`): `src/lib/server/tarefas.ts` com `criarTarefa` (fim da List + coluna padrão do Kanban) e `marcarFeita` (ponto único que escreve `done`; move o card; recorrência avança o prazo e reabre subtarefas), com `tarefas.test.ts`. `src/lib/server/posicao.ts` com `PASSO`, `MIN`, `entre()`.
- Página pública `/share/<hash>` (visual novo), feed iCal `/ical/<token>`, export `/api/export`, saúde `/api/saude`.
- `scripts/seed-vikunja.py` (dados reais do Vikunja; token no `.env` local).

Ainda não existe: API de tarefa (POST/GET/PATCH/DELETE/feita), painel de detalhe, criação rápida, checkbox, página do projeto com List/Kanban/Table, filtros salvos (CRUD), descrição rica, comentários, anexos, link público na UI, PWA.

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

Mesma decomposição que ficou pronta em 2026-09-23. Dispare a **onda 1** como 4 subagentes em paralelo (ferramenta `task`, um `tasks[]`), cada um dono só dos seus arquivos, sem rodar `npm test`/`check`/`build` do projeto inteiro e sem commitar. Main integra, verifica e commita no fim da onda.

**Preparação** (Main, antes de disparar): `cp .dev-wipe-me.db .dev-agente{1..4}.db` (os arquivos já existem da sessão anterior; recopie para partir dos dados reais limpos). Cada agente sobe o próprio dev server com o `hub` (`op:start`): `node node_modules/vite/bin/vite.js dev --port <porta> --strictPort --host 127.0.0.1`, env `ADMIN_PASSWORD_HASH=scrypt:x SESSION_SECRET=prototipo-prototipo-prototipo-prototipo TZ=America/Sao_Paulo ORIGIN=http://127.0.0.1:<porta> FILES_PATH=D:/git/projMan/.svelte-kit DB_PATH=D:/git/projMan/<banco>`.

### Contratos fixos (onda 1)

1. **Painel de detalhe**: `src/lib/components/tarefa/PainelTarefa.svelte`, montado uma vez em `src/routes/(app)/+layout.svelte` (pelo agente Tarefa). Abre quando a URL tem `?tarefa=<id>` em qualquer página do grupo `(app)` (painel de ~380 px no desktop; tela cheia ≤768 px); fecha removendo o parâmetro. Toda view abre uma tarefa com link para a URL atual + `tarefa=<id>`. Depois de mutação: `invalidateAll()`.
2. **API JSON** (agente Tarefa implementa, os outros consomem):
   - `POST /api/tarefas` `{project_id, title, due_date?, due_all_day?, priority?, parent_task_id?}` → 201 `{id}` (usa `criarTarefa`).
   - `GET /api/tarefas/<id>` → `{id, project_id, projeto, parent_task_id, mae, title, description, done, due_date, due_all_day, priority, repeat_every, repeat_unit, created_at, labels: number[], subtarefas: [{id,title,done}]}`.
   - `PATCH /api/tarefas/<id>` parcial `{title?, due_date?, due_all_day?, priority?, repeat_every?, repeat_unit?, labels?: number[], project_id?}` → `{ok:true}`. Trocar de projeto remove e recria as linhas de `task_positions`/`task_buckets` no projeto novo; o trigger de subtarefa vira 400.
   - `DELETE /api/tarefas/<id>` → 204. `POST /api/tarefas/<id>/feita` `{feita: boolean}` → `{ok:true}` (usa `marcarFeita`). `GET /api/labels` → labels.
   - Prazo: com hora, o cliente manda `toISOString()`; dia inteiro, manda `YYYY-MM-DD` + `due_all_day:true`, e o **servidor** converte para o fim daquele dia civil no `TZ` (#8).
3. **Página do projeto** (agente Views): `src/routes/(app)/projeto/[id]/` com abas List (`/projeto/<id>`), Kanban (`/projeto/<id>/kanban`) e Table (`/projeto/<id>/tabela`). Só Main troca os links da sidebar de `/?projeto=<id>` para `/projeto/<id>` e adiciona o link `/filtros`.
4. **Checkbox** em qualquer linha ou card: otimista → `POST /api/tarefas/<id>/feita`; se falhar, reverte e mostra erro inline, sem retry.

Validação em tudo que vem do cliente (ids inteiros seguros, strings com trim ≤200, enums); SQL só com fragmentos fixos e parâmetros; 400 com mensagem, 404 para id inexistente.

### Onda 1: quatro agentes

| Agente | Porta / banco | Itens | Dono de | Pronto quando |
|---|---|---|---|---|
| **Tarefa** | 5181 / `.dev-agente1.db` | 3 | `src/routes/api/tarefas/+server.ts` (+POST), `src/routes/api/tarefas/[id]/**`, `src/routes/api/labels/**`, `src/lib/components/tarefa/**`, `src/routes/(app)/+page.svelte`, `src/routes/(app)/+layout.svelte` (só montar o painel e o FAB), funções novas em `src/lib/server/tarefas.ts` (`lerTarefa`, `atualizarTarefa`, `apagarTarefa`, troca de labels) + teste | Clicar abre o painel; editar título/prazo/prioridade/labels/recorrência/projeto persiste; subtarefas (um nível) com checkbox e criação inline; marcar feita e apagar funcionam; criação rápida no topo (desktop: título + data, no projeto atual ou no primeiro projeto ativo) e FAB + sheet no celular; linhas com checkbox e título como link. Descrição só leitura (TipTap é o item 4). Precisará de componentes shadcn: `select`, `label`, `textarea`, `alert-dialog` |
| **Views** | 5182 / `.dev-agente2.db` | 5 e 6 | `src/routes/(app)/projeto/[id]/**`, `src/lib/server/views.ts` + teste, `src/routes/api/posicao/**`, `package.json` (`npm i sortablejs && npm i -D @types/sortablejs --ignore-scripts`) | List com todas as tarefas do projeto (abertas; `?feitas=1` mostra as feitas), subtarefas recuadas, arrastar pela alça → `{task_id, view_id, antes, depois}` e o servidor calcula `entre()` e renumera a view abaixo de `MIN`. Table com colunas fixas e `?ordem=titulo|prazo|prioridade`. Kanban: colunas dos buckets, cards por `task_buckets.position`, WIP só sinaliza, arrastar → `{task_id, bucket_id, antes, depois}`; entrar no bucket de feitas = `marcarFeita(true)`, sair dele = `marcarFeita(false)`, depois grava a posição do drop. SortableJS com `forceFallback`, `delay:250`, `delayOnTouchOnly`; no `onEnd` devolve o nó e atualiza o estado (padrão da branch `prototipo/16-kanban`). Carrega a view inteira (sem rolagem infinita) |
| **Filtros** | 5183 / `.dev-agente3.db` | 7 | `src/routes/(app)/filtros/**`, `src/lib/server/filtros-salvos.ts` + teste | Plano já feito pelo agente: `formParaFiltro(form)` puro + criar/atualizar/apagar/mover/buscar (mover igual a `moverProjeto`; `parseFiltro` sempre antes de gravar; título com `titulo()`). Rotas `/filtros` (lista, subir/descer, apagar), `/filtros/novo`, `/filtros/<id>` com um componente `ConstrutorFiltro.svelte` (radio e select **nativos** estilizados, sem instalar componentes novos; labels com rádio de 3 vias ''/in/notIn + "sem label alguma"). Salvar redireciona para `/?filtro=<id>`. Os 4 casos do #15 criados pela UI mostram as tarefas certas |
| **PwaLink** | 5184 / `.dev-agente4.db` | 9 e 10 | `src/routes/(app)/projetos/+page.svelte` e `+page.server.ts` (só o link público), funções de link em `src/lib/server/projetos.ts` + teste, `src/service-worker.ts`, `static/manifest.webmanifest`, `src/app.html` | Link público por projeto em `/projetos`: criar (hash `crypto.randomBytes(30).toString('base64url')`, 40 chars), mostrar URL com copiar, revogar (apaga a linha). Sem cookie, `/share/<hash>` abre; depois de revogar, 404. PWA: manifest (start_url `/?lista=hoje`, standalone, ícones 192/512 + maskable), `<link rel=manifest>` e theme-color claro/escuro, SW nativo (`$service-worker`): cache-first nos assets, network-first com fallback para GET de navegação e `GET /api/tarefas*`, nunca cachear não-GET, nunca `/login`, `/logout`, `/api/export`, `/ical/*`; `skipWaiting` + `clients.claim` + reload no `controllerchange` (script inline com `nonce="%sveltekit.nonce%"`) |

**Integração da onda 1 (Main)**: sidebar → `/projeto/<id>` e link `/filtros`; conferir que o painel abre a partir das três views; `npm test`, `npm run check`, `npm run build`; verificação no browser com os dados reais (desktop e 390 px); commit; smoke da imagem no Docker local; avisar o usuário para dar *force update*.

### Onda 2 (depende do painel)

- **Item 4 (descrição rica)**: TipTap no painel; `sanitize-html` na escrita (whitelist do #4); segunda passagem gera `description_text`. Estender `scripts/seed-vikunja.py` para trazer o HTML da descrição sanitizado.
- **Item 8 (comentários e anexos)**: no painel; anexo ≤25 MB em `FILES_PATH`; varredura de órfãos no boot. Estender o seed para comentários e anexos.

Depois: **item 11** (fechamento do v1). Recarregar a produção com o seed completo só se o usuário pedir, e com export antes (a produção já tem dados).

## Backlog de build (em ordem executável)

Cada item fecha completo antes do próximo. Entre parênteses, a origem.

1. ✅ **Base da UI.** Tailwind + shadcn-svelte (tema padrão, base neutra), Boxicons, fonte do sistema. Tema claro/escuro por `prefers-color-scheme` + alternância guardada em `localStorage`. Shell do #14: sidebar fixa (smart lists, projetos, filtros salvos, seção "Arquivados" recolhida, tema), drawer no celular. As smart lists leem `GET /api/tarefas` com rolagem infinita por cursor. Estados vazio, carregando (skeleton) e erro inline. (#14, #11, decisão 17) — *feito em 2026-09-23. A página de projeto hoje é a mesma lista (`/?projeto=<id>`, mostra também arquivado); vira List view no item 5. Os ícones internos dos componentes shadcn vêm de `@lucide/svelte`; os nossos são Boxicons.*
2. ✅ **Projetos e labels.** Criar, renomear, reordenar (`projects.position`), arquivar/desarquivar, apagar (físico, com confirmação). Labels globais: criar, cor, apagar. (#9) — *feito em 2026-09-23. Reordenar por botões subir/descer (renumera a lista toda, passo 1024); arrastar fica para quando o SortableJS entrar (item 6), se fizer falta. Confirmação com `confirm()` nativo.*
3. ◐ **Tarefa.** Criação rápida (campo no topo + data no desktop; FAB + folha no celular). Detalhe em painel lateral com `?tarefa=<id>` (tela cheia no celular): título, prazo (com ou sem hora), prioridade 0–5, labels, recorrência, projeto. `marcarFeita` é o ponto único que escreve `done`, move o card para o bucket de feitas e avança a recorrência (`src/lib/datas.ts`). Subtarefas em um nível. Checkbox inline otimista com rollback. (#7, #8, #14) — *núcleo pronto (`criarTarefa`, `marcarFeita`, testes); API, painel e UI vão na onda 1 do plano.*
4. **Descrição rica.** TipTap no detalhe; `sanitize-html` na escrita, com a whitelist do #4; segunda passagem produz `description_text` para o FTS5. (#4, ADR 0002)
5. **List e Table.** Ordenação manual por view (`task_positions`): `entre(antes, depois)`, passo 1024, renumeração abaixo de 0,01, calculada no servidor. Table com colunas fixas. Ordenação e filtro de view na URL. (#7, #16, ADR 0001)
6. **Kanban.** Três buckets por projeto, SortableJS (`forceFallback`, `delay: 250` só no toque). `PATCH` de mover: `{ bucket_id, antes, depois }`; o servidor calcula a posição e renumera a coluna. Mover para o bucket de feitas = `marcarFeita`, e sair dele reabre. O WIP só sinaliza. (#7, #16)
7. **Filtros salvos.** CRUD com o construtor do #15 (formulário numa coluna, label com tem/não tem, "sem label alguma", "criada há mais de"). Toda escrita e leitura passa por `parseFiltro`. (#11, #15)
8. **Comentários e anexos.** Comentário com o mesmo TipTap e a mesma sanitização. Anexo até 25 MB em `FILES_PATH`, metadados em `attachments`, download com `Content-Disposition`. Varredura de órfãos no boot. (#9, #12, ADR 0005)
9. **Link público.** Criar e revogar na UI do projeto (a rota `/share/<hash>` já existe). (#10)
10. **PWA.** `src/service-worker.ts` nativo (cache-first nos assets, network-first no resto, mutação nunca cacheada), manifest com ícones 192/512 + maskable, reload no `controllerchange`. (#5, ADR 0004)
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
- **Browser de verificação (relay)**: com `emulate({ device })`, `tab.click` por coordenada pode acertar o elemento errado. Use `evaluate("el.click()")` ou teste sem emulação.
- **Vite no Windows**: `localhost` resolve para `::1`; a checagem de porta do `hub` espera `127.0.0.1`. Suba com `--host 127.0.0.1`.

## Fatos do ambiente

- **UNRAID**: `root@192.168.1.10`, chave `C:/Users/EDalcin/.ssh/unraid_ed25519`. Templates em `/boot/config/plugins/dockerMan/templates-user/` (prefixo `my-`).
- **Volumes em produção (decisão do usuário, 2026-09-23)**: banco em `/mnt/user/Storage/appsdata/projman/db/projman.db` (share do array, disk2), anexos em `/mnt/user/Storage/appsdata/projman/files`. O usuário conhece o risco do WAL no FUSE e escolheu assim; não reabra o assunto. Backup (Appdata Backup ou `/api/export`) deve cobrir esse caminho.
- **Carga feita em 2026-09-23 19:37**: produção recebeu "Entre Ciências" do Vikunja (59 tarefas, 14 subtarefas, 5 labels). O banco vazio anterior ficou em `.../projman/db/antes-da-carga/`. Depois dessa data a produção tem dados reais: não rode o script contra ela de novo sem export antes.
- **Porta: 8426.**
- **Local**: Node v22.23.0, npm 10.9.8, Docker 29.1.3.

## Stack fixado (por `AGENTS.md`)

SvelteKit + shadcn-svelte, Boxicons, TipTap, SQLite em `DB_PATH`, PWA, tema claro/escuro, rolagem infinita (nunca paginação), Docker em `ghcr.io/edalcin/projman`, GitHub Actions com tags `latest` + SHA curto, container não-root, documentação em Markdown, diagramas em Mermaid, arquitetura em C4.
