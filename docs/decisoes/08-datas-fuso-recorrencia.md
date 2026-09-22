# #8 — Semântica de datas, fuso e recorrência

Decidido em 2026-09-22. Ticket [#8](https://github.com/edalcin/projMan/issues/8).

## Decisões

| # | Questão | Decisão |
|---|---|---|
| 1 | Formato no SQLite | **TEXT ISO-8601 em UTC** (`2026-09-22T20:30:00Z`). Ordena por comparação de string, é legível num dump, e as funções `date()`/`datetime()` do SQLite o entendem. Epoch inteiro economiza bytes e custa legibilidade em toda inspeção |
| 2 | Instante ou dia civil | Coluna `due_all_day INTEGER NOT NULL DEFAULT 1`. Prazo sem hora é um **dia civil**; o instante guardado é o fim do dia no fuso local convertido para UTC. Prazo com hora é o instante exato. Sem heurística de "23:59 quer dizer dia inteiro" |
| 3 | Fuso | **`TZ` do servidor é a única fonte.** O cliente nunca manda offset. App de um usuário: dois relógios seria uma fonte de erro sem ganho |
| 4 | Fronteira do dia | "Hoje" = `[00:00:00.000, 23:59:59.999]` no fuso de `TZ`. Uma função `limitesDoDia(data)` devolve o par em UTC, e **todas** as smart lists a usam. É a regra única |
| 5 | Biblioteca de datas | Nenhuma. `Intl.DateTimeFormat` com `timeZone` já converte; zero dependência |
| 6 | Regra de recorrência | `repeat_every INTEGER` + `repeat_unit TEXT` (`day`/`week`/`month`/`year`). Colunas tipadas, não string tipo `2w`: o filtro consulta sem fazer parse |
| 7 | Fim de mês | 31 de janeiro + 1 mês = **28 (ou 29) de fevereiro** — clamp ao último dia do mês de destino. O dia de origem não é lembrado; o ciclo seguinte parte do prazo já ajustado |
| 8 | Marcar recorrente como feita | **Avança o prazo da mesma linha.** Sem histórico de instâncias, sem tabela de ocorrências. `done` volta a falso e o card volta ao bucket padrão (regra do #7) |
| 9 | Recorrente atrasada vários ciclos | **Pula para a próxima ocorrência futura**, num laço a partir do prazo anterior. Nunca gera instâncias acumuladas |
| 10 | Subtarefas de recorrente | As subtarefas diretas voltam a `done = false` quando o pai avança. É o caso de uso real: checklist que se repete |
| 11 | `done_at` | Registrado (`TEXT NULL`). Nenhuma smart list o usa no v1, mas dado de conclusão não destruído é dado que não precisa ser reconstruído |

## Colunas que isto fixa para o schema (#9)

```
tasks(
  due_date        TEXT NULL,      -- ISO-8601 UTC
  due_all_day     INTEGER NOT NULL DEFAULT 1,
  start_date      TEXT NULL,
  end_date        TEXT NULL,
  done            INTEGER NOT NULL DEFAULT 0,
  done_at         TEXT NULL,
  repeat_every    INTEGER NULL,
  repeat_unit     TEXT NULL       -- day | week | month | year
)
```

`repeat_every` e `repeat_unit` são nulos juntos ou preenchidos juntos.

## Invariantes

1. Todo instante gravado está em **UTC**. A conversão para o fuso local acontece
   só na borda: exibição e `limitesDoDia()`.
2. `proximoPrazo(task)` calcula sempre a partir do **prazo anterior**, nunca da
   data de conclusão (decisão de escopo já fechada), e faz laço até passar de
   agora.
3. `marcarFeita(task)` (ponto único do #7) é quem chama `proximoPrazo`, reabre
   as subtarefas e escreve `done_at`.

## O que ficou de fora e quando volta

- Recorrência por regra RRULE ("toda segunda e quinta"): quando `repeat_every` +
  `repeat_unit` não bastar. Vira uma coluna `rrule` opcional.
- Histórico de ocorrências: quando quiser relatório de conclusões. Precisa de
  tabela nova — é a única decisão aqui com custo de migração.
- Fuso por cliente: só faz sentido com mais de um usuário, que está fora de escopo.
