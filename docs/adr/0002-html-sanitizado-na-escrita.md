# HTML sanitizado no servidor, na escrita

**Status:** Aceito, 2026-09-23

## Contexto

A descrição da Tarefa e o corpo do Comentário vêm como HTML do editor TipTap. Esse HTML é renderizado de volta, inclusive no Link Público (`/share/<hash>`), e também precisa virar texto pesquisável para a busca (FTS5).

## Decisão

`sanitize-html` roda no servidor **na escrita** (antes do `INSERT`/`UPDATE`), com whitelist explícita de tags/atributos, `transformTags` para `rel`/`target` em links, e `allowedSchemes` sem `javascript:`, `data:` nem `vbscript:`. Uma segunda passagem, com `allowedTags: []` sobre o HTML já sanitizado, produz a coluna derivada `description_text`, indexada por `tasks_fts` (FTS5 *external content*).

## Consequências

### Positivas

- Uma dependência cobre as duas necessidades: segurança e texto de busca.
- Toda rota de leitura (inclusive o Link Público) confia no HTML armazenado, sem decisão de escape repetida em cada tela.
- `description_text` mantém o índice FTS5 livre de marcação.

## Alternativas descartadas

- **Sanitizar na leitura**: cada rota de renderização (inclusive `/share`) teria que reimplementar a mesma whitelist — mais superfície para um esquecimento.
- **DOMPurify + jsdom**: 28 MB de dependência, exige um DOM simulado no servidor.
- **`xss`**: sem release desde 2024-03.

## Origem

Issue [#4](https://github.com/edalcin/projMan/issues/4) (research), consumida em [#10](https://github.com/edalcin/projMan/issues/10). Detalhe: `docs/proximosPassos.md` ("Resultados dos tickets de research"), `docs/decisoes/10-autenticacao.md` (item 16, CSP). Schema: `migrations/001_inicial.sql` (`tasks.description_text`, `tasks_fts`).
