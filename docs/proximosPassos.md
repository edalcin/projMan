# projMan — próximos passos

> Documento de estado. Toda sessão nova começa por aqui.
> Última atualização: 2026-09-21.

## Como retomar (instruções para a sessão nova)

Gatilho do usuário: **"continue conforme o proximosPassos.md"**. Sem mais nada dito, faça exatamente isto, nesta ordem.

**Passo 0 — orientação (não pergunte nada antes de fazer).**
- Leia este documento inteiro.
- Leia o mapa: `gh issue view 1 --repo edalcin/projMan`.
- Confira a fronteira: `gh issue list --repo edalcin/projMan --state open` e, para cada issue aberta, `gh api repos/edalcin/projMan/issues/<n> --jq '.issue_dependencies_summary.blocked_by'` — zero significa takeable.
- Não releia o Vikunja; as decisões dele já estão destiladas abaixo.

**Passo 1 — a entrega pendente vem primeiro.** Execute a seção [Como retomar essa entrega](#como-retomar-essa-entrega): app mínimo, `Dockerfile`, workflow, `.env.example`, template do UNRAID, seção no README. É trabalho mecânico, sem decisão pendente, e produz a imagem que permite testar tudo o que vier depois. Termine com a verificação do passo 8 dessa seção; só então declare feito.

**Passo 2 — voltar ao planejamento.** Com a entrega no ar, siga o mapa: assuma o ticket [#7](https://github.com/edalcin/projMan/issues/7) (primeiro da fronteira), reivindique-o com `gh issue edit 7 --add-assignee @me` **antes** de qualquer trabalho, e conduza-o com as skills `grilling` e `domain-modeling` — é um ticket HITL, então as perguntas vão ao usuário, **uma por vez** (preferência dele), com recomendação em cada uma. Ao resolver: comentário com a resposta, `gh issue close`, e uma linha nova em *Decisions so far* no corpo da issue #1.

**Regras desta jornada** (valem em toda sessão):
- Um ticket por sessão, exceto `research`, que pode ir em paralelo por subagente.
- Perguntas ao usuário: **uma por vez**, sempre com recomendação.
- Modo `ponytail` (full): a escada YAGNI vale para cada decisão; a opção que remove código ganha.
- Responda em português, com jargão técnico em inglês, frases curtas.
- Commit direto na `main`. Nunca criar branch. Nunca commitar segredo.
- Ao encerrar, atualize este documento: estado, o que ficou pendente, e os fatos novos do ambiente.

**Onde estão as coisas**: repositório `D:/git/projMan` (`origin` = `github.com/edalcin/projMan`, público, issues ativas, `gh` autenticado como `edalcin`). Tracker do wayfinder = issues deste repositório. Nenhum job em voo; a sessão de 2026-09-21 fechou com a `main` sincronizada com o `origin` (o último commit é a atualização deste documento).

## Onde o projeto está

**Fase: planejamento (wayfinding).** Não existe código de aplicação ainda. O repositório tem `README.md`, `LICENSE` e este documento.

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
| [#7 Modelo de views, buckets e configuração por projeto](https://github.com/edalcin/projMan/issues/7) | grilling (HITL) | **livre** |
| [#8 Semântica de datas, fuso e recorrência](https://github.com/edalcin/projMan/issues/8) | grilling (HITL) | **livre** |
| [#10 Autenticação, sessão e garantias da rota pública](https://github.com/edalcin/projMan/issues/10) | grilling (HITL) | **livre** (destravado por #3 e #4) |

Bloqueados: [#9 schema](https://github.com/edalcin/projMan/issues/9) (espera #7, #8, #2) → [#11 smart lists](https://github.com/edalcin/projMan/issues/11) → [#15 protótipo do filtro](https://github.com/edalcin/projMan/issues/15); [#12 iCal e export](https://github.com/edalcin/projMan/issues/12); [#13 Docker/CI/UNRAID](https://github.com/edalcin/projMan/issues/13); [#14 protótipo do shell](https://github.com/edalcin/projMan/issues/14); [#16 protótipo do Kanban](https://github.com/edalcin/projMan/issues/16). [#17](https://github.com/edalcin/projMan/issues/17) consolida a spec e fecha o mapa.

**Caminho crítico**: #7 + #8 → #9 (schema) → #11 → #15. O schema é o gargalo, e os dois tickets que o destravam são independentes entre si.

## Trabalho pedido e NÃO concluído

O usuário pediu, no fim da sessão de 2026-09-21, duas entregas de execução que ficaram **incompletas** (a sessão foi encerrada por limite de créditos):

1. **Template do UNRAID** em `/boot/config/plugins/dockerMan/templates-user/my-projMan.xml`, para subir o container pela interface (Docker → Add).
2. **GitHub Action** que publique uma imagem nova a cada alteração de código.

**Nada disso foi criado.** Não existe `Dockerfile`, `.github/workflows/`, `package.json`, `.env.example` nem template — o repositório tem só `README.md`, `LICENSE` e este documento. O scaffold do SvelteKit que havia sido iniciado em `D:/git/_projman_scaffold` foi cancelado e **a pasta já foi apagada**; o scaffold recomeça do zero.

### Como retomar essa entrega

Pré-requisito que a próxima sessão precisa decidir primeiro: o CI só fica verde se a imagem construir, e construir exige um app mínimo. Ordem sugerida:

1. `npx sv create` (template `minimal`, TypeScript, sem add-ons) num diretório temporário; copiar para o repositório; trocar `adapter-auto` por `@sveltejs/adapter-node`.
2. Rota de saúde (`/api/saude`) que confirme banco acessível e `FILES_PATH` gravável — é o que o `HEALTHCHECK` chama.
3. `Dockerfile` multi-stage por #6: `node:22-alpine`, `npm ci --omit=dev` no estágio final, `USER 99:100`, `HEALTHCHECK` em Node puro.
4. `.github/workflows/docker.yml`: push na `main` → `docker/metadata-action` com `latest` + SHA curto → build com cache `type=gha` → Trivy → push para `ghcr.io/edalcin/projman`. Permissão `packages: write` no `GITHUB_TOKEN`.
5. `.env.example` com `DB_PATH`, `FILES_PATH`, `ADMIN_PASSWORD_HASH`, `ORIGIN`, `PORT`, `TZ`, `BODY_SIZE_LIMIT`; `.env` no `.gitignore`.
6. Template XML do UNRAID e cópia para o servidor.
7. Seção de instalação no UNRAID no `README.md`.
8. Verificar: build local da imagem + `curl` na rota de saúde; depois push na `main` e acompanhar o workflow até publicar no GHCR.

Formalmente isto é o ticket [#13](https://github.com/edalcin/projMan/issues/13), que está bloqueado pelo schema (#9). O empacotamento em si não depende do schema — só as migrações dependem. Se retomar por aqui, o Dockerfile e o CI podem sair antes, e o ticket #13 fica para a decisão de migração, backup e atualização.

## Fatos do ambiente (verificados em 2026-09-21)

- **UNRAID**: `root@192.168.1.10`, chave `C:/Users/EDalcin/.ssh/unraid_ed25519`.
- **Templates**: `/boot/config/plugins/dockerMan/templates-user/`, com prefixo `my-` (o UNRAID o adiciona).
- **Pool físico**: `/mnt/cache/appdata` existe — é onde `DB_PATH` deve ficar (ver armadilha 1). Anexos podem ir no share (`/mnt/user/Storage/appsdata/projman/files`), porque não usam WAL.
- **Portas já ocupadas**: 2222, 3123, 3333, 3474, 3773, 3876, 4567, 5678, 6379, 8000, 8070, 8080, 8090, 8100, 8112, 8181, 8321, 8334, 8383, 8432, 8443, 8642, 8778, 8787, 8788, 8989, 9090, 9119, 9696, 58846, 58946. **Sugestão: 8426** (livre na lista; confirmar que nenhum template a reserva antes de fixar).
- **Local**: Node v22.23.0, npm 10.9.8, Docker 29.1.3 — dá para construir e testar a imagem antes de subir.
- **Estudo do Vikunja** (desta sessão): inventário de features em `agent://VikunjaFeatures`, domain model com 32 entidades em `agent://VikunjaDomain`. Se os artefatos expirarem, o repositório do Vikunja é a fonte: `pkg/models/*.go`.

## Stack fixado (por `AGENTS.md`)

SvelteKit + shadcn-svelte, Boxicons, TipTap, SQLite em `DB_PATH`, PWA, tema claro/escuro, rolagem infinita (nunca paginação), Docker em `ghcr.io/edalcin/projMan`, GitHub Actions com tags `latest` + SHA curto, container não-root, documentação em Markdown, diagramas em Mermaid, arquitetura em C4.
