# #7 — Modelo de views, buckets e configuração por projeto

Decidido em 2026-09-22. Ticket [#7](https://github.com/edalcin/projMan/issues/7).

## Decisões

| # | Questão | Decisão |
|---|---|---|
| 1 | Representação da view | Linha em `project_views`. As três (List, Kanban, Table) são criadas no insert do projeto. Rota `/projeto/<id>/view/<view_id>` |
| 2 | CRUD de views | Não existe. Três views fixas por projeto. Kanban alternativo = filtro salvo aplicado ao mesmo Kanban |
| 3 | Buckets | Só manuais. Projeto novo nasce com **A fazer / Fazendo / Feito**. Sem `BucketConfigurationMode` |
| 4 | Done bucket | Bidirecional. Arrastar para o done bucket marca `done`; marcar feita em qualquer view move o card. Recorrente volta ao bucket padrão com o próximo prazo |
| 5 | WIP limit | `buckets.limit` (0 = sem limite). Só sinaliza (contador vermelho no cabeçalho); o drop é sempre aceito |
| 6 | Filtro e ordenação | Estado da **URL** (`?filtro=&ordem=`), lido no `+page.server.ts`. Não é persistido |
| 7 | Table view | Colunas fixas: título, prazo, prioridade, labels, done. Sem seletor de colunas |
| 8 | Bucket padrão | `project_views.default_bucket_id`. Tarefa nova e recorrente reaberta caem nele |

## Formato para o schema (#9)

```
project_views(id, project_id, view_kind, position, default_bucket_id, done_bucket_id)
buckets(id, project_view_id, title, position, limit DEFAULT 0)
task_buckets(task_id, bucket_id, position REAL)
task_positions(task_id, project_view_id, position REAL)
```

`view_kind` é extensível — Gantt entra depois sem migração de dados.

## Invariante

`marcarFeita(task)` é o **ponto único** que escreve `done`, move o card em
`task_buckets` e trata a recorrência. Nenhum outro caminho escreve `done`.

## O que ficou de fora e quando volta

- Buckets por filtro: quando as smart lists e o filtro salvo não bastarem. Entra como coluna `filter` em `buckets`.
- CRUD de views: liberar o insert em `project_views`; o schema já aceita.
- WIP limit bloqueante: verificação no servidor dentro de `marcarFeita`/mover.
- Lembrar a última ordenação: `localStorage`, três linhas.
