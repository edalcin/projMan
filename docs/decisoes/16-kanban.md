# #16 — Protótipo do Kanban

Issue: [#16](https://github.com/edalcin/projMan/issues/16). Fechado em 2026-09-23.
Protótipo (fonte primária, fora da `main`): branch `prototipo/16-kanban`, rota `/prototipo/kanban?n=<cards por coluna>&estado=offline`.
Self-check da conta: `node src/lib/prototipo/posicao.ts` (na branch).

**Veredito: a posição `REAL` por ponto médio se confirma.** Nenhuma outra estratégia é necessária.

## Resultado por ponto

| Ponto | Medido no protótipo | Decisão |
|---|---|---|
| Ponto médio | Entre colunas e dentro da coluna: `(anterior + posterior) / 2`; na ponta, `vizinho ± PASSO`. O DOM e o estado ficaram coerentes nos dois casos | Mantido |
| Espaçamento | Com passo 1, só **7** inserções seguidas no mesmo vão antes de cair abaixo de 0,01. Com passo **1024**, **17** | Posição inicial e renumeração usam passo **1024**. Limiar de 0,01 mantido |
| Renumeração | "Martelar o vão 20×": dispara uma vez na 17ª inserção, e reescreve só a coluna afetada | Renumera a coluna (`bucket_id`) ou a view (List/Table) inteira, numa transação |
| Quem calcula | — | **O servidor.** O cliente manda `bucket_id` + ids dos vizinhos (`antes`, `depois`); o servidor calcula a posição, renumera se preciso e responde. O cliente só reordena o array: não guarda números nem confia neles |
| Otimista e falha | Com `?estado=offline`: o card move na hora; em 300 ms a requisição falha, o estado volta ao snapshot anterior, e uma faixa de erro inline diz "Sem conexão: #1 voltou para A fazer." | Snapshot antes de mover; em erro, restaura e mostra erro inline (mesmo padrão do #14), sem retry |
| Toque vs rolagem | iPhone 13 emulado: um swipe rápido rolou a página 379 px e não arrastou; pressão longa (400 ms) arrastou o card para a 4ª posição | **SortableJS** com `forceFallback: true` (o mesmo caminho por ponteiro no mouse e no toque), `delay: 250`, `delayOnTouchOnly: true`, `touchStartThreshold: 5` |
| Biblioteca | DnD nativo do HTML não funciona em toque. SortableJS: 45 KB minificado, sem dependências | SortableJS. No `onEnd`, o nó volta ao lugar original e o Svelte move o DOM a partir do estado (um só dono do DOM) |
| Volume | Render de 3 × 200 cards: 12 ms; de 3 × 1000: 38 ms. O arrasto continua fluido com 1000 por coluna | **Sem virtualização.** O Kanban carrega todos os cards da view, sem rolagem infinita por coluna (uso próprio: dezenas de cards). Teto: alguns milhares por coluna |

## O que entra no build

- `entre(antes, depois)` e a renumeração no servidor, com teste das pontas e do limiar.
- `PATCH` de mover card: `{ bucket_id, antes, depois }` → posição nova (ou a coluna renumerada).
- Dependência nova: `sortablejs`.
