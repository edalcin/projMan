# projMan — próximos passos

> Documento de estado. Toda sessão nova começa por aqui.
> Última atualização: 2026-09-22.

## Como retomar (instruções para a sessão nova)

Gatilho do usuário: **"continue conforme o proximosPassos.md"**. Sem mais nada dito, faça exatamente isto, nesta ordem.

**Passo 0 — orientação (não pergunte nada antes de fazer).**
- Leia este documento inteiro.
- Leia o mapa: `gh issue view 1 --repo edalcin/projMan`.
- Confira a fronteira: `gh issue list --repo edalcin/projMan --state open` e, para cada issue aberta, `gh api repos/edalcin/projMan/issues/<n> --jq '.issue_dependencies_summary.blocked_by'` — zero significa takeable.
- Não releia o Vikunja; as decisões dele já estão destiladas abaixo.

**Passo 1 — a entrega de empacotamento já está feita** (ver seção "Entrega de empacotamento — CONCLUÍDA"). Nada a repetir ali. Teste de container é sempre no Docker local; nunca no UNRAID.

**Passo 2 — planejamento.** Próximo da fronteira: [#12](https://github.com/edalcin/projMan/issues/12) (feed iCal e pacote de export). Reivindique com `gh issue edit 12 --add-assignee @me` **antes** de trabalhar. O usuário autorizou seguir **direto com a recomendação** em cada pergunta: decida, registre e mostre, sem parar para perguntar. Ao resolver: arquivo em `docs/decisoes/`, comentário na issue, `gh issue close`, e uma linha em *Decisions so far* no corpo da #1.

**Regras desta jornada** (valem em toda sessão):
- Vários tickets por sessão, em ordem, se o usuário disser "siga". Cada ticket fecha completo (código + teste + doc + issue) antes do próximo. `research` pode ir em paralelo por subagente.
- Perguntas ao usuário: **uma por vez**, sempre com recomendação. Desde 2026-09-22 o usuário autorizou assumir a recomendação sem perguntar; ele corrige depois se discordar.
- Modo `ponytail` (full): a escada YAGNI vale para cada decisão; a opção que remove código ganha.
- Responda em português, com jargão técnico em inglês, frases curtas.
- Commit direto na `main`. Nunca criar branch. Nunca commitar segredo.
- Ao encerrar, atualize este documento: estado, o que ficou pendente, e os fatos novos do ambiente.

**Onde estão as coisas**: repositório `D:/git/projMan` (`origin` = `github.com/edalcin/projMan`, público, issues ativas, `gh` autenticado como `edalcin`). Tracker do wayfinder = issues deste repositório. Nenhum job em voo, nenhum container de teste rodando. A sessão de 2026-09-22 fechou com a `main` sincronizada com o `origin` e o último CI verde.

**Sessão de 2026-09-22 — o que foi feito**: entrega de empacotamento (Dockerfile, CI, template), depois os tickets #7, #8, #9, #10 e #11, fechados nesta ordem. Cada um tem o seu `docs/decisoes/NN-*.md`, comentário na issue e linha em *Decisions so far* na #1.

## Onde o projeto está

**Fase: planejamento (wayfinding), com código de base já no ar.** O repositório tem o app mínimo SvelteKit, `Dockerfile`, CI, template do UNRAID, o schema v1 (`migrations/001_inicial.sql`), as regras de data (`src/lib/datas.ts`), a autenticação (hook, `/login`, `/logout`, `/share/<hash>`), as smart lists e o filtro salvo (`src/lib/server/filtro.ts`, `GET /api/tarefas`) e `docs/decisoes/`. `npm test` roda 27 testes. A única UI de domínio é a página pública do `/share`; o resto vem com os protótipos (#14, #16).

O planejamento vive no tracker, não neste arquivo:

- **Mapa**: [issue #1 — projMan: mapa do caminho até a spec do v1](https://github.com/edalcin/projMan/issues/1), label `wayfinder:map`.
- **Tickets**: issues #2 a #17, sub-issues do mapa, com as dependências nativas do GitHub ligadas.
- Para retomar o planejamento: invoque `/wayfinder` com a issue #1. Uma sessão resolve **um** ticket (exceto tickets de `research`, que podem ir em paralelo).

O mapa é o índice das decisões; o detalhe de cada uma está no comentário de resolução do seu ticket.

## O que a ferramenta é

Gestor de projetos e tarefas de **uso próprio**, auto-hospedado no UNRAID, inspirado nas funcionalidades do [Vikunja](https://github.com/go-vikunja/vikunja) — não no stack dele (Go + Vue). Das 32 entidades do domain model do Vikunja, o v1 fica com cerca de 12.

**Destino do mapa**: spec funcional em `docs/`, arquitetura em C4 (Mermaid), ADRs das decisões duras, `CONTEXT.md` com o glossário, e este documento com o backlog de build. O mapa fecha quando nada resta a decidir.

## Decisões já fechadas

Vindas da sessão de charting (14 decisões de escopo) e dos 5 tickets de `research` (fechados):

| Tema | Decisão |
|---|---|
| Usuários | Usuário único. **Sem tabela `users`**, sem teams, sem assignees. Senha de admin por variável de ambiente, guardada como hash |
| Compartilhamento | **Link público read-only por projeto** (`link_shares`, hash de 40 chars, `permission=read` por construção) |
| Views | List, Kanban e Table no v1. Gantt fora de escopo, schema compatível (`start_date`/`end_date`, `view_kind` extensível) |
| Periféricos que entram | Feed iCal, anexos de arquivo, comentários |
| Periféricos que saem | CalDAV, webhooks, API tokens, e-mail, importadores, backgrounds de projeto, Quick Add Magic |
| Offline | PWA instalável com **cache de leitura**; escrita exige rede. Sem motor de sync, logo IDs inteiros (sem UUIDv7) |
| Exposição | Cloudflare Tunnel; nenhuma porta aberta no roteador |
| Hierarquia | Subtarefas por `parent_task_id`. Projetos planos. Sem relações livres entre tarefas |
| Busca | Smart lists fixas (Hoje, 7 dias, Atrasadas, Sem prazo, Todas as abertas) + filtro salvo montado por campos, persistido como JSON. Sem linguagem de consulta |
| Lembretes | Nenhum canal ativo no v1. Web Push fica para depois |
| Renderização | SvelteKit híbrido: `+page.server.ts` para leitura e para `/share/<hash>`, `+server.ts` para mutações interativas |
| Recorrência | Data fixa, calculada a partir do **prazo anterior**, nunca da data de conclusão |
| Persistência | `DB_PATH` (banco) e `FILES_PATH` (anexos), dois volumes. Varredura de órfãos no boot. Export `.zip` (dump JSON + arquivos) |
| Texto rico | HTML do TipTap **sanitizado no servidor na escrita** + coluna derivada `description_text` para FTS5 |
| Ordenação | Posição por view: `task_positions (task_id, project_view_id, position REAL)` para List/Table; posição dentro da coluna em `task_buckets`. Ponto médio, renumeração abaixo de 0,01 |

### Resultados dos tickets de research (fechados)

| Ticket | Decisão |
|---|---|
| [#2](https://github.com/edalcin/projMan/issues/2) SQLite | `better-sqlite3` (prebuilds glibc **e** musl, FTS5 nativo, sem toolchain na imagem). FTS5 como *external content table* com triggers. `WAL` + `busy_timeout=5000` + `synchronous=NORMAL`. Migrações em SQL numerado no boot, sem biblioteca |
| [#3](https://github.com/edalcin/projMan/issues/3) Sessão | Cookie assinado por HMAC, sem tabela `sessions`. `scrypt` do `node:crypto` (N=131072, r=8, p=1) + `timingSafeEqual`, hash em `ADMIN_PASSWORD_HASH`. `ORIGIN` + `ADDRESS_HEADER=CF-Connecting-IP` no `adapter-node`. Rate limit em `Map` de memória |
| [#4](https://github.com/edalcin/projMan/issues/4) Sanitização | `sanitize-html` na escrita; `transformTags` para `rel`/`target`; `allowedSchemes` sem `javascript:`/`data:`/`vbscript:`; segunda passagem com `allowedTags: []` produz o `description_text` |
| [#5](https://github.com/edalcin/projMan/issues/5) PWA | Service worker nativo (`src/service-worker.ts`), sem `@vite-pwa`. Cache-first nos assets, network-first com fallback no resto, mutação nunca cacheada. `skipWaiting` + `clients.claim` com reload no `controllerchange` |
| [#6](https://github.com/edalcin/projMan/issues/6) Empacotamento | `node:22-alpine`, `USER 99:100`, healthcheck em Node puro, CI build → Trivy → push com cache `type=gha` e tags `latest` + SHA curto |

### Duas armadilhas a não esquecer

1. **`DB_PATH` deve apontar para o mountpoint físico do pool** (`/mnt/cache/appdata/projman`), **nunca** para o share FUSE (`/mnt/user/...`): o FUSE não entrega a memória compartilhada que o modo WAL do SQLite exige, e o resultado é corrupção. Vira ADR e aviso no README.
2. **`ORIGIN` e `ADDRESS_HEADER` no `adapter-node` são requisito**, não detalhe: sem eles a proteção de CSRF do SvelteKit rejeita todo POST atrás do Cloudflare Tunnel com 403.

## Fronteira do mapa — o que está takeable

| Ticket | Tipo | Estado |
|---|---|---|
| ~~#7 views e buckets~~ | grilling | **fechado em 2026-09-22** — ver `docs/decisoes/07-views-buckets.md` |
| ~~#8 datas, fuso e recorrência~~ | grilling | **fechado em 2026-09-22** — ver `docs/decisoes/08-datas-fuso-recorrencia.md`, implementado em `src/lib/datas.ts` |
| ~~#9 schema~~ | design | **fechado em 2026-09-22** — ver `docs/decisoes/09-schema.md`; DDL em `migrations/001_inicial.sql` |
| ~~#10 autenticação~~ | grilling | **fechado em 2026-09-22** — ver `docs/decisoes/10-autenticacao.md` |
| ~~#11 smart lists e filtro~~ | grilling | **fechado em 2026-09-22** — ver `docs/decisoes/11-smart-lists-filtro.md` |
| [#12 Feed iCal e pacote de export](https://github.com/edalcin/projMan/issues/12) | grilling | **livre** |
| [#13 Docker/CI/UNRAID](https://github.com/edalcin/projMan/issues/13) | grilling | **livre** — empacotamento feito; falta backup e política de atualização |
| [#14 Protótipo do shell](https://github.com/edalcin/projMan/issues/14) | prototype | **livre** |
| [#15 Protótipo do filtro salvo](https://github.com/edalcin/projMan/issues/15) | prototype | **livre** (destravado por #11) |
| [#16 Protótipo do Kanban](https://github.com/edalcin/projMan/issues/16) | prototype | **livre** |

Bloqueados: [#17](https://github.com/edalcin/projMan/issues/17) consolida a spec e fecha o mapa (espera todos).

**Caminho crítico**: #15 → #17. Restam #12, #13, #14, #15 e #16; todos livres.

**Regra nova de schema**: a `001` foi editada no lugar em 2026-09-22 porque ainda não havia banco em produção. **Daqui em diante, toda mudança de schema é uma migração nova** (`002_…sql`), nunca uma edição da `001`.

## Entrega de empacotamento — CONCLUÍDA (2026-09-22)

- App mínimo SvelteKit (`sv` template `minimal`, TS) com `@sveltejs/adapter-node`; adapter configurado no `vite.config.ts` (o `sv` novo não gera `svelte.config.js`).
- Rota `GET /api/saude`: abre o banco (aplica as migrações) e confere que `FILES_PATH` é gravável. Responde `schema vN`.
- `Dockerfile` multi-stage `node:22-alpine`, `USER 99:100`, `HEALTHCHECK` em Node puro. **O `npm` global é removido da imagem final** — era a fonte dos 11 CVEs HIGH/CRITICAL que reprovavam o Trivy.
- `.github/workflows/docker.yml`: build local → Trivy (`aquasecurity/trivy-action@v0.36.0`, com `v`) → push `latest` + SHA curto para `ghcr.io/edalcin/projman`. **Verde**, pacote público (pull anônimo confirmado).
- `.env.example`, `.dockerignore`, template em `deploy/unraid/my-projMan.xml` (também copiado para o servidor), seção de instalação no `README.md`.
- Verificação: `docker build` + `docker run` **na máquina local**, `/api/saude` → 200, health `healthy`.

**Regra nova do usuário**: nunca subir container no UNRAID para teste. O UNRAID é só produção e recebe apenas o template XML; todo teste de container é no Docker local (Windows). Já gravada no `AGENTS.md` global.

Falta do ticket [#13](https://github.com/edalcin/projMan/issues/13): backup e política de atualização. As migrações já existem (`PRAGMA user_version`, ver #9).

**Armadilha de build**: `better-sqlite3` v13 traz os binários no pacote, mas o npm roda o `node-gyp` implícito por causa do `binding.gyp`. No Alpine isso falha. O `Dockerfile` e o CI usam `npm ci --ignore-scripts`. Não remova.

**Para subir no UNRAID agora** (o template já foi atualizado no servidor): o container **exige** `ADMIN_PASSWORD_HASH` (gere com `node scripts/hash-senha.ts` nesta máquina) e `SESSION_SECRET` (`openssl rand -base64 48`). Sem eles o container sai logo no boot, de propósito.

## Fatos do ambiente (verificados em 2026-09-22)

- **UNRAID**: `root@192.168.1.10`, chave `C:/Users/EDalcin/.ssh/unraid_ed25519`.
- **Templates**: `/boot/config/plugins/dockerMan/templates-user/`, com prefixo `my-` (o UNRAID o adiciona).
- **Pool físico**: `/mnt/cache/appdata` existe — é onde `DB_PATH` deve ficar (ver armadilha 1). Anexos podem ir no share (`/mnt/user/Storage/appsdata/projman/files`), porque não usam WAL.
- **Porta fixada: 8426** (confirmado: nenhum template do UNRAID a reserva). Ocupadas: 2222, 3123, 3333, 3474, 3773, 3876, 4567, 5678, 6379, 8000, 8070, 8080, 8090, 8100, 8112, 8181, 8321, 8334, 8383, 8432, 8443, 8642, 8778, 8787, 8788, 8989, 9090, 9119, 9696, 58846, 58946.
- **Local**: Node v22.23.0, npm 10.9.8, Docker 29.1.3 — dá para construir e testar a imagem antes de subir.
- **Estudo do Vikunja**: os artefatos `agent://VikunjaFeatures` e `agent://VikunjaDomain` provavelmente expiraram. A fonte é o repositório do Vikunja, `pkg/models/*.go`. Quase nada mais depende dele: as decisões estão em `docs/decisoes/`.

## Armadilhas de teste (aprendidas em 2026-09-22)

- **Smoke test na imagem**: sempre `docker build` + `docker run` local, com volume (`-v projman-testdata:/data`), `TZ`, `ORIGIN`, `ADDRESS_HEADER`, `ADMIN_PASSWORD_HASH` e `SESSION_SECRET`. Remova o container e o volume no fim.
- **Form action do SvelteKit** sem `Accept: text/html` responde JSON com status 200, e não 303. Em testes com cliente HTTP, mande o header.
- **`tsc --noEmit`** acusa `./$types` ausente até rodar `svelte-kit sync`. O `npm run build` já roda o sync.
- **Módulo de servidor com efeito no import** (ex.: abrir o banco) precisa do guarda `building` de `$app/environment`: o build do SvelteKit importa as rotas para analisá-las.
- **Seed de teste gerado pelo Python no Windows**: grave com `encoding='utf-8'`. O padrão é cp1252, e acento chega corrompido ao Node.
- **`subprocess(shell=True)` no Windows usa `cmd.exe`**: `2>/dev/null` falha. Use lista de args e `cwd`.
- **Seed dentro do container**: `require('/app/node_modules/better-sqlite3')` com caminho absoluto; um script em `/tmp` não resolve o `node_modules`.

## Stack fixado (por `AGENTS.md`)

SvelteKit + shadcn-svelte, Boxicons, TipTap, SQLite em `DB_PATH`, PWA, tema claro/escuro, rolagem infinita (nunca paginação), Docker em `ghcr.io/edalcin/projMan`, GitHub Actions com tags `latest` + SHA curto, container não-root, documentação em Markdown, diagramas em Mermaid, arquitetura em C4.
