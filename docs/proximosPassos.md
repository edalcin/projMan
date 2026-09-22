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

**Passo 2 — planejamento.** Próximo da fronteira: [#9](https://github.com/edalcin/projMan/issues/9), o **schema** — destravado em 2026-09-22 (`blocked_by: 0`) e gargalo de outros cinco tickets. Reivindique com `gh issue edit 9 --add-assignee @me` **antes** de trabalhar. As colunas já fixadas estão em `docs/decisoes/07-views-buckets.md` e `08-datas-fuso-recorrencia.md`. Ao resolver: arquivo em `docs/decisoes/`, comentário na issue, `gh issue close`, e uma linha em *Decisions so far* no corpo da #1.

**Regras desta jornada** (valem em toda sessão):
- Um ticket por sessão, exceto `research`, que pode ir em paralelo por subagente.
- Perguntas ao usuário: **uma por vez**, sempre com recomendação.
- Modo `ponytail` (full): a escada YAGNI vale para cada decisão; a opção que remove código ganha.
- Responda em português, com jargão técnico em inglês, frases curtas.
- Commit direto na `main`. Nunca criar branch. Nunca commitar segredo.
- Ao encerrar, atualize este documento: estado, o que ficou pendente, e os fatos novos do ambiente.

**Onde estão as coisas**: repositório `D:/git/projMan` (`origin` = `github.com/edalcin/projMan`, público, issues ativas, `gh` autenticado como `edalcin`). Tracker do wayfinder = issues deste repositório. Nenhum job em voo; a sessão de 2026-09-21 fechou com a `main` sincronizada com o `origin` (o último commit é a atualização deste documento).

## Onde o projeto está

**Fase: planejamento (wayfinding), com o empacotamento já entregue.** O repositório tem o app mínimo SvelteKit, `Dockerfile`, CI, template do UNRAID e `docs/`. Lógica de domínio ainda não existe — espera o schema (#9).

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
| [#9 Schema do SQLite](https://github.com/edalcin/projMan/issues/9) | design | **livre** — destravado por #2, #7 e #8; gargalo de 5 tickets |
| [#10 Autenticação, sessão e garantias da rota pública](https://github.com/edalcin/projMan/issues/10) | grilling (HITL) | **livre** (destravado por #3 e #4) |

Bloqueados (esperam #9): [#11 smart lists](https://github.com/edalcin/projMan/issues/11) → [#15 protótipo do filtro](https://github.com/edalcin/projMan/issues/15); [#12 iCal e export](https://github.com/edalcin/projMan/issues/12); [#13 Docker/CI/UNRAID](https://github.com/edalcin/projMan/issues/13) (só a parte de migração/backup); [#14 protótipo do shell](https://github.com/edalcin/projMan/issues/14); [#16 protótipo do Kanban](https://github.com/edalcin/projMan/issues/16). [#17](https://github.com/edalcin/projMan/issues/17) consolida a spec e fecha o mapa.

**Caminho crítico**: #9 (schema) → #11 → #15. O schema está livre; #10 (auth) é independente e pode vir a qualquer momento.

## Entrega de empacotamento — CONCLUÍDA (2026-09-22)

- App mínimo SvelteKit (`sv` template `minimal`, TS) com `@sveltejs/adapter-node`; adapter configurado no `vite.config.ts` (o `sv` novo não gera `svelte.config.js`).
- Rota `GET /api/saude`: confere que o diretório de `DB_PATH` e `FILES_PATH` estão graváveis. Abrir o banco entra aqui quando o schema (#9) existir.
- `Dockerfile` multi-stage `node:22-alpine`, `USER 99:100`, `HEALTHCHECK` em Node puro. **O `npm` global é removido da imagem final** — era a fonte dos 11 CVEs HIGH/CRITICAL que reprovavam o Trivy.
- `.github/workflows/docker.yml`: build local → Trivy (`aquasecurity/trivy-action@v0.36.0`, com `v`) → push `latest` + SHA curto para `ghcr.io/edalcin/projman`. **Verde**, pacote público (pull anônimo confirmado).
- `.env.example`, `.dockerignore`, template em `deploy/unraid/my-projMan.xml` (também copiado para o servidor), seção de instalação no `README.md`.
- Verificação: `docker build` + `docker run` **na máquina local**, `/api/saude` → 200, health `healthy`.

**Regra nova do usuário**: nunca subir container no UNRAID para teste. O UNRAID é só produção e recebe apenas o template XML; todo teste de container é no Docker local (Windows). Já gravada no `AGENTS.md` global.

Falta do ticket [#13](https://github.com/edalcin/projMan/issues/13): migrações, backup e política de atualização — dependem do schema (#9).

## Fatos do ambiente (verificados em 2026-09-21)

- **UNRAID**: `root@192.168.1.10`, chave `C:/Users/EDalcin/.ssh/unraid_ed25519`.
- **Templates**: `/boot/config/plugins/dockerMan/templates-user/`, com prefixo `my-` (o UNRAID o adiciona).
- **Pool físico**: `/mnt/cache/appdata` existe — é onde `DB_PATH` deve ficar (ver armadilha 1). Anexos podem ir no share (`/mnt/user/Storage/appsdata/projman/files`), porque não usam WAL.
- **Porta fixada: 8426** (confirmado: nenhum template do UNRAID a reserva). Ocupadas: 2222, 3123, 3333, 3474, 3773, 3876, 4567, 5678, 6379, 8000, 8070, 8080, 8090, 8100, 8112, 8181, 8321, 8334, 8383, 8432, 8443, 8642, 8778, 8787, 8788, 8989, 9090, 9119, 9696, 58846, 58946.
- **Local**: Node v22.23.0, npm 10.9.8, Docker 29.1.3 — dá para construir e testar a imagem antes de subir.
- **Estudo do Vikunja** (desta sessão): inventário de features em `agent://VikunjaFeatures`, domain model com 32 entidades em `agent://VikunjaDomain`. Se os artefatos expirarem, o repositório do Vikunja é a fonte: `pkg/models/*.go`.

## Stack fixado (por `AGENTS.md`)

SvelteKit + shadcn-svelte, Boxicons, TipTap, SQLite em `DB_PATH`, PWA, tema claro/escuro, rolagem infinita (nunca paginação), Docker em `ghcr.io/edalcin/projMan`, GitHub Actions com tags `latest` + SHA curto, container não-root, documentação em Markdown, diagramas em Mermaid, arquitetura em C4.
