# #12 — Feed iCal e pacote de export

Decidido em 2026-09-23. Ticket [#12](https://github.com/edalcin/projMan/issues/12).
Código: [`src/lib/server/ical.ts`](../../src/lib/server/ical.ts) (rota `GET /ical/<token>`),
[`src/lib/server/exportar.ts`](../../src/lib/server/exportar.ts) (rota `GET /api/export`).

## Feed iCal

| # | Questão | Decisão |
|---|---|---|
| 1 | `VTODO` ou `VEVENT` | **`VEVENT`**. O Google Calendar ignora `VTODO`; um feed que o calendário principal não mostra não serve para nada |
| 2 | Escopo | **Um feed global.** Usuário único: feed por projeto ou por filtro é código sem uso. Volta se aparecer o pedido |
| 3 | Autenticação | Token na URL, vindo de **`ICAL_TOKEN`** (opcional, mín. 32 chars; `openssl rand -hex 20` = 160 bits, a mesma entropia do `/share`). Sem tabela, sem UI. Sem a variável, a rota responde 404. Comparação por `timingSafeEqual` sobre SHA-256 dos dois lados. Token errado e feed desligado dão o mesmo 404 |
| 4 | Revogar | Trocar `ICAL_TOKEN` e reiniciar. Igual ao `SESSION_SECRET` (#10) |
| 5 | Quais tarefas | Abertas, **com prazo**, de projeto não arquivado (mesma regra das smart lists, #11). Subtarefas entram como eventos próprios. Atrasadas ficam no dia em que venceram |
| 6 | `UID` | `task-<id>@projman`: estável, porque o id nunca muda (#9) |
| 7 | Feita ou apagada | **Some** do feed; o cliente a remove no próximo refresh. Sem `STATUS:CANCELLED` nem histórico |
| 8 | Dia inteiro × hora | `due_all_day=1` → `DTSTART;VALUE=DATE` com o dia civil do `TZ` (#8). Com hora → `DTSTART` em UTC. **Sem `DTEND`**: pela RFC 5545, `DATE` dura um dia e `DATE-TIME` é um instante — é o que um prazo é |
| 9 | Recorrentes | **Só o próximo prazo, sem `RRULE`.** A recorrência do #8 pula ciclos vencidos e faz clamp no fim do mês; uma `RRULE` divergiria disso e mostraria ciclos futuros como se já estivessem pendentes |
| 10 | Conteúdo | `SUMMARY` = título; `DESCRIPTION` = `Projeto: <nome>`. Descrição da tarefa, comentários e anexos **não** saem pelo feed: a URL vive num servidor de terceiros (Google) |
| 11 | Formato | CRLF, escape de `\ ; , \n`, dobra em 75 octetos sem partir caractere UTF-8. `Cache-Control: no-store` |

## Export

| # | Questão | Decisão |
|---|---|---|
| 12 | Formato do dump | **Cópia do `.db` por `VACUUM INTO`**, não JSON. Snapshot consistente mesmo com escrita em curso (WAL), restaurável sem código, legível em qualquer ferramenta SQLite. SQLite é formato recomendado de preservação da Library of Congress. JSON por tabela seria um serializador e um importador a manter, sem leitor humano melhor |
| 13 | Contêiner | **`.tar.gz`**, não `.zip`. `ustar` + `node:zlib` = ~40 linhas, zero dependência, streaming numa passada, sem o teto de 4 GiB do zip sem ZIP64. O `tar` do Windows 10+ e o 7-Zip abrem. Muda a decisão de charting que dizia `.zip` |
| 14 | Anexos | `files/<stored_name>`, o mesmo caminho relativo de `FILES_PATH`. Vão só os que o **snapshot** referencia: órfãos no disco ficam de fora, e anexo apagado entre o snapshot e a leitura é pulado |
| 15 | Acionamento | **Download pela UI**: `GET /api/export` com sessão. O botão entra com o shell (#14). Nada é escrito em volume |
| 16 | Memória | Stream: snapshot em `tmpdir()`, depois cabeçalho + `createReadStream` por arquivo, gzip no fim do pipe. Memória constante. O snapshot é apagado no `finally`, também quando o download é cancelado (`pipeline` propaga o cancelamento) |
| 17 | Import | **Não existe.** Restaurar = parar o container, descompactar, copiar `projman.db` para `DB_PATH` e `files/` para `FILES_PATH` (`docs/instalacao.md`). Um import pela app exigiria validar e trocar o banco com o processo vivo |

Tetos conhecidos: `ustar` limita o nome a 100 bytes (o `stored_name` é gerado pelo
servidor; nome longo lança erro, não corrompe) e o arquivo a 8 GiB. `VACUUM INTO`
bloqueia o event loop enquanto copia — irrelevante no volume de um usuário.

## Relação com #13

O export **é** o backup manual. A política de backup automático (appdata backup
do UNRAID sobre os dois volumes, ou export agendado) fica no #13.

## Verificação

- `src/lib/server/ical-export.test.ts` (3 testes): o feed tem só as abertas com
  prazo de projeto ativo, na ordem do prazo; dia inteiro sai com o dia de São Paulo,
  não o de UTC; escape e dobra corretos com título de 80 `ç` (nenhuma linha > 75
  octetos, desdobrar devolve o título inteiro); token curto ou ausente é recusado;
  o `.tar.gz` é aberto pelo **`tar` do sistema**, contém `projman.db` legível e só o
  anexo referenciado (o órfão fica de fora); o snapshot temporário some.
- Imagem no **Docker local** com `TZ=America/Sao_Paulo`: `/ical/<token>` → 200
  `text/calendar`, prazo de fim de 23/09 local sai `DATE:20260923`, vírgula escapada;
  token errado → 404; `/api/export` sem sessão → 401, com sessão → 200 com
  `Content-Disposition`, o Python `tarfile` abre, o banco extraído tem a tarefa;
  `/tmp` do container vazio depois do download.

## O que ficou de fora e quando volta

- Feed por projeto ou por filtro salvo: quando houver um segundo calendário a assinar.
- `DTEND` com duração: se algum cliente desenhar mal o evento-instante.
- Import pela app: se restaurar à mão virar rotina.
