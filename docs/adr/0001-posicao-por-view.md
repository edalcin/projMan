# Posição real por view, com ponto médio e renumeração

**Status:** Aceito, 2026-09-23

## Contexto

Tarefa precisa de uma ordem estável e reordenável por arrasto em três Views (List, Table, Kanban), sem reescrever todas as posições a cada movimento.

## Decisão

Coluna `position REAL`. `task_positions (task_id, project_view_id, position)` ordena List/Table; `task_buckets (task_id, project_view_id, bucket_id, position)` ordena dentro do Bucket do Kanban. Inserção por ponto médio — `(anterior + posterior) / 2`, ou `vizinho ± passo` na ponta. Passo inicial e de renumeração: **1024**. Limiar de renumeração: espaçamento abaixo de **0,01**, dispara reescrita da coluna (ou da View inteira), numa única transação. O **servidor** calcula a posição a partir de `bucket_id` (ou `project_view_id`) e dos ids vizinhos (`antes`, `depois`); o cliente nunca envia nem confia em números, só reordena o array local.

## Consequências

### Positivas

- Mover uma Tarefa é uma escrita, não uma cascata.
- Renumeração é rara (passo 1024 aguenta 17 inserções seguidas no mesmo vão) e sempre uma transação isolada por coluna/View.
- Combina bem com atualização otimista: o cliente move na hora, sem esperar o número real.

### Negativas

- Precisão de ponto flutuante degrada com inserções repetidas no mesmo vão; mitigado pelo passo largo e pela renumeração automática.
- Toda mutação de posição depende do servidor calcular; não há atalho no cliente.

## Alternativas descartadas

- **Inteiro com shift de todos**: cada inserção reescreve todas as posições seguintes — O(n) por movimento.
- **LexoRank / fractional string ranking**: resolve o mesmo problema com mais complexidade e uma dependência a mais do que o ponto médio em `REAL` exige para o volume de dados do projeto (uso próprio, poucas centenas de Tarefas).
- **Posição global única** (sem separar por View/Bucket): impediria List/Table e Kanban terem ordens independentes.

## Origem

Issues [#7](https://github.com/edalcin/projMan/issues/7), [#9](https://github.com/edalcin/projMan/issues/9), [#16](https://github.com/edalcin/projMan/issues/16). Detalhe: `docs/decisoes/07-views-buckets.md`, `docs/decisoes/09-schema.md`, `docs/decisoes/16-kanban.md`. Schema: `migrations/001_inicial.sql` (tabelas `task_positions`, `task_buckets`).
