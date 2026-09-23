# PWA só de leitura offline, escrita exige rede

**Status:** Aceito, 2026-09-23

## Contexto

O v1 quer uma PWA instalável, com cache de leitura offline, sem pagar o custo de um motor de sincronização para escrita offline.

## Decisão

Service worker nativo (`src/service-worker.ts`, sem `@vite-pwa/sveltekit`). Cache-first nos assets versionados; network-first com fallback no resto. Mutação (POST/PATCH/DELETE) nunca é cacheada nem enfileirada: sem rede, a escrita falha no `fetch` e a UI mostra erro inline, sem retry automático. Sem motor de sincronização, os IDs continuam inteiros do SQLite — não há necessidade de `UUIDv7` para registros criados offline, porque nenhum registro é criado offline.

## Consequências

### Positivas

- Nenhuma lógica de resolução de conflito, fila de escrita local ou CRDT.
- Menor service worker que ainda deixa a app instalável e navegável offline.

### Negativas

- Nenhuma criação ou edição de Tarefa offline: toda mutação exige conexão ativa.
- Uma futura "escrita offline" é um subsistema novo, não uma extensão deste.

## Alternativas descartadas

- **Local-first / CRDT**: apontado como o item mais caro e a maior fonte de bugs difíceis do projeto, para uma instância de um usuário só.
- **Fila de escrita offline com sync em segundo plano**: mesma classe de custo do CRDT, descartada junto.

## Origem

Issues [#5](https://github.com/edalcin/projMan/issues/5), [#14](https://github.com/edalcin/projMan/issues/14). Mapa (`gh issue view 1`, "Offline"). Detalhe: `docs/proximosPassos.md` ("Decisões já fechadas" → Offline; "Resultados dos tickets de research" #5).
