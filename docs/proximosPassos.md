# projMan — próximos passos

> Documento de estado. Toda sessão nova começa por aqui.
> Última atualização: 2026-09-23.

## Estado atual

**Fase: build do v1.** O planejamento terminou em 2026-09-23 (mapa [#1](https://github.com/edalcin/projMan/issues/1) fechado). Itens 1 e 2 do backlog prontos; o próximo é o **item 3**.

O que já existe e funciona (`npm test`: 35 testes):

- `Dockerfile`, CI (build → Trivy → push para `ghcr.io/edalcin/projman`), template do UNRAID em `deploy/unraid/my-projMan.xml`, README com instalação, backup e atualização.
- Schema v1 (`migrations/001_inicial.sql`) e as migrações no boot, com snapshot `.bak` antes de migrar (`src/lib/server/migrar.ts`).
- Regras de data e recorrência (`src/lib/datas.ts`); texto do prazo na lista (`src/lib/prazo.ts`).
- Autenticação: hook, `/login`, `/logout`, sessão HMAC, rate limit.
- Smart lists, filtro salvo e página de projeto no servidor: `resolverFiltro` + `listarTarefas` (`src/lib/server/filtro.ts`), `GET /api/tarefas?lista=|filtro=|projeto=`.
- **Shell da UI** (item 1): Tailwind v4 + shadcn-svelte (preset Vega, base neutra, fonte do sistema), Boxicons. Rota `/` no grupo `src/routes/(app)/`: sidebar do shadcn (smart lists, projetos, filtros salvos, "Arquivados" recolhido, tema), drawer no celular, lista com a primeira página no SSR e rolagem infinita, skeleton, vazio e erro inline com "Tentar de novo". Tema por `prefers-color-scheme` + `localStorage`, aplicado antes da pintura em `src/app.html`.
- **Projetos e labels** (item 2): página `/projetos` (ícone ⚙ no grupo Projetos da sidebar), form actions com `use:enhance`. Criar, renomear, subir/descer, arquivar/desarquivar, apagar com confirmação; labels com nome e cor. Regras em `src/lib/server/projetos.ts`.
- Página pública `/share/<hash>` (só leitura), feed iCal `/ical/<token>`, export `/api/export`, saúde `/api/saude`.

Ainda não existe: CRUD de tarefa, detalhe da tarefa, mutações de tarefa, sanitização, anexos, PWA.

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

Gatilho do usuário: **"continue conforme o proximosPassos.md"**. Então:

1. Leia este documento e o item do backlog a fazer (o primeiro sem ✅).
2. Leia só as partes de `docs/spec.md`, `CONTEXT.md` e `docs/decisoes/` que o item cita.
3. Implemente o item inteiro: código + teste do que pode quebrar + smoke test (UI: verificação no browser).
4. Marque ✅ no item, atualize "Estado atual", faça commit e push na `main`.
5. Se o usuário disser "siga", passe ao próximo item.

**Regras** (valem em toda sessão):
- Uma pergunta ao usuário por vez, sempre com recomendação. O usuário autorizou assumir a recomendação sem perguntar; ele corrige depois.
- Modo `ponytail` (full): a opção que remove código ganha.
- Responda em português, com jargão técnico em inglês, frases curtas.
- Commit direto na `main`. Nunca criar branch (a exceção dos protótipos acabou). Nunca commitar segredo.
- Toda mudança de schema é uma migração nova (`002_…sql`); nunca edite a `001`.
- Teste de container só no Docker local; o UNRAID é só produção.
- Template do UNRAID: `deploy/unraid/my-projMan.xml` no repositório é só o modelo, sem segredo (campos sensíveis vazios, `Mask="true"`). **NUNCA copie esse arquivo por cima de `/boot/config/plugins/dockerMan/templates-user/my-projMan.xml` no servidor**: depois que o container existe, esse arquivo guarda os valores que o usuário digitou (senha, segredo, ORIGIN, caminhos). Em 2026-09-23 uma cópia apagou esses valores e o container voltou com `ORIGIN=''`. Mudou variável, porta ou volume → edite o XML do repositório, commit, e **avise o usuário** para ajustar pela UI do UNRAID (Docker → Edit). Atualizar a imagem = *Check for Updates* / *force update* na UI, feito pelo usuário. Ícone: `static/icon-512.png`.

## Backlog de build (em ordem executável)

Cada item fecha completo antes do próximo. Entre parênteses, a origem.

1. ✅ **Base da UI.** Tailwind + shadcn-svelte (tema padrão, base neutra), Boxicons, fonte do sistema. Tema claro/escuro por `prefers-color-scheme` + alternância guardada em `localStorage`. Shell do #14: sidebar fixa (smart lists, projetos, filtros salvos, seção "Arquivados" recolhida, tema), drawer no celular. As smart lists leem `GET /api/tarefas` com rolagem infinita por cursor. Estados vazio, carregando (skeleton) e erro inline. (#14, #11, decisão 17) — *feito em 2026-09-23. A página de projeto hoje é a mesma lista (`/?projeto=<id>`, mostra também arquivado); vira List view no item 5. Os ícones internos dos componentes shadcn vêm de `@lucide/svelte`; os nossos são Boxicons.*
2. ✅ **Projetos e labels.** Criar, renomear, reordenar (`projects.position`), arquivar/desarquivar, apagar (físico, com confirmação). Labels globais: criar, cor, apagar. (#9) — *feito em 2026-09-23. Reordenar por botões subir/descer (renumera a lista toda, passo 1024); arrastar fica para quando o SortableJS entrar (item 6), se fizer falta. Confirmação com `confirm()` nativo.*
3. **Tarefa.** Criação rápida (campo no topo + data no desktop; FAB + folha no celular). Detalhe em painel lateral com `?tarefa=<id>` (tela cheia no celular): título, prazo (com ou sem hora), prioridade 0–5, labels, recorrência, projeto. `marcarFeita` é o ponto único que escreve `done`, move o card para o bucket de feitas e avança a recorrência (`src/lib/datas.ts`). Subtarefas em um nível. Checkbox inline otimista com rollback. (#7, #8, #14)
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

- **`DB_PATH` no mountpoint físico do pool** (`/mnt/cache/appdata/projman`), **nunca** no share FUSE (`/mnt/user/...`): o FUSE não entrega a memória compartilhada que o WAL exige.
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
- **Volumes**: banco em `/mnt/cache/appdata/projman`; anexos podem ir no share (`/mnt/user/Storage/appsdata/projman/files`), porque não usam WAL.
- **Porta: 8426.**
- **Local**: Node v22.23.0, npm 10.9.8, Docker 29.1.3.

## Stack fixado (por `AGENTS.md`)

SvelteKit + shadcn-svelte, Boxicons, TipTap, SQLite em `DB_PATH`, PWA, tema claro/escuro, rolagem infinita (nunca paginação), Docker em `ghcr.io/edalcin/projman`, GitHub Actions com tags `latest` + SHA curto, container não-root, documentação em Markdown, diagramas em Mermaid, arquitetura em C4.
