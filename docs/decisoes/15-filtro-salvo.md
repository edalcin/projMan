# #15 — Protótipo do filtro salvo

Issue: [#15](https://github.com/edalcin/projMan/issues/15). Fechado em 2026-09-23.
Protótipo (fonte primária, fora da `main`): branch `prototipo/15-filtro`, rota `/prototipo/filtro`.
Código real: `src/lib/server/filtro.ts`; teste "os quatro casos do #15 cabem em AND e passam no validador".

**Veredito: AND puro basta.** Nenhum dos quatro casos precisou de OR. Faltavam dois campos, e agora eles existem no formato v1.

## Os quatro casos

| Caso | JSON gerado pelo construtor | Resultado |
|---|---|---|
| Abertas, prazo nos próximos 7 dias, sem label | `{"v":1,"labels":{"nenhuma":true},"prazo":{"tipo":"proximos","dias":7}}` | Precisou de **`labels.nenhuma`**: `notIn` não expressa "nenhuma label" |
| Prioridade alta ou urgente, qualquer projeto | `{"v":1,"prioridadeMin":3}` | A prioridade é uma escala ordenada (3 alta, 4 urgente, 5 agora): o "ou" vira uma faixa, não um OR |
| Label 'herbário' e não feita | `{"v":1,"labels":{"in":[1]}}` | Já cabia: o estado padrão é abertas |
| Sem prazo e criada há mais de 30 dias | `{"v":1,"prazo":{"tipo":"sem"},"criadaHaMaisDe":30}` | Precisou de **`criadaHaMaisDe`** (dias, 1–3650) → `created_at < agora − N×24 h` |

## Mudanças no formato v1

Os campos são novos e opcionais, então não há troca de versão. Um filtro já salvo continua válido.

- `labels.nenhuma: true` → `NOT EXISTS (SELECT 1 FROM task_labels …)`. Só aceita `true`. Com `labels.in`, dá erro: a combinação é uma contradição, sempre vazia.
- `criadaHaMaisDe: 1..3650` → `t.created_at < ?`. O `created_at` já está no formato canônico (`%Y-%m-%dT%H:%M:%fZ`).
- Nenhuma mudança de schema.

## UI

- Um formulário numa coluna só, na ordem Nome → Estado → Projetos → Labels → Prioridade mínima → Prazo → Criada há mais de → Texto. Uma frase fixa diz: "Todas as condições valem juntas (E)."
- Labels: por label, dois botões exclusivos, **tem** / **não tem**, mais o chip "sem label alguma". O chip e "tem" se desativam um ao outro.
- Cabe em 390 px (iPhone 13 emulado) sem rolagem horizontal: 979 px de altura, o que é rolável e aceitável para uma tela de edição.
- O JSON é montado no cliente e sempre validado no servidor por `parseFiltro` (POST/PATCH do filtro salvo, no build).

## Quando o OR volta

Quando um filtro real pedir uma união de valores **não ordenados** entre campos diferentes (ex.: "label X **ou** projeto Y"). União dentro de um campo já existe (`projetos`, `labels.in` são listas). O `v` do formato continua reservado para isso.
