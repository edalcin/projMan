# #11 — Smart lists e formato do filtro salvo

Decidido em 2026-09-22. Ticket [#11](https://github.com/edalcin/projMan/issues/11).
Código: [`src/lib/server/filtro.ts`](../../src/lib/server/filtro.ts), rota `GET /api/tarefas`.

## Decisão central

**Uma smart list é um filtro salvo pré-definido.** `SMART` é um mapa de filtros no
mesmo formato JSON que o usuário grava. Existe um caminho só de validação, tradução
para SQL e paginação, e as smart lists passam no próprio validador.

## Decisões

| # | Questão | Decisão |
|---|---|---|
| 1 | Smart lists | As cinco, nenhuma a mais: **Hoje**, **7 dias**, **Atrasadas**, **Sem prazo**, **Todas as abertas**. Todas mostram só tarefas abertas |
| 2 | Janelas | Hoje = `[início, fim]` do dia local (`limitesDoDia`, #8). 7 dias = do início de hoje ao fim do dia hoje+7. Atrasadas = prazo **antes do início de hoje**: o que vence hoje, mesmo com hora já passada, fica em Hoje, não em Atrasadas. Uma regra, sem sobreposição |
| 3 | Projeto arquivado | **Some** de toda smart list e de todo filtro |
| 4 | Subtarefas | Aparecem **soltas**, como linhas próprias, com o título da mãe ao lado (`mae`). Aninhar numa lista filtrada esconderia uma subtarefa que casa com o filtro dentro de uma mãe que não casa |
| 5 | Formato do filtro (v1) | `{ v: 1, estado?, projetos?, labels?: { in?, notIn? }, prioridadeMin?, prazo?, texto? }`. `prazo` é `{tipo: atrasadas \| hoje \| sem}` ou `{tipo: proximos, dias: 1..366}`. Campo ausente = sem restrição. `estado` padrão = abertas |
| 6 | Combinação | **Só AND.** OR e grupos ficam de fora |
| 7 | Validação | `parseFiltro(unknown)`, à mão, sem biblioteca: tipos, faixas, listas de 1–200 ids inteiros positivos, texto ≤ 200. **Campo desconhecido é erro**: um typo (`projeto` em vez de `projetos`) não pode virar um filtro silenciosamente mais largo. Valida na escrita **e na leitura** do banco |
| 8 | JSON → SQL | Todo fragmento SQL é fixo no código; valores só entram por parâmetro. Listas de ids viram `?` contados |
| 9 | Texto | Busca FTS5 em **título e descrição** (não em comentários). Cada palavra vira `"termo"*` com aspas dobradas: `OR`, `NEAR`, `col:` e aspas digitados viram texto, nunca sintaxe. É um campo do filtro **e** a caixa de busca sempre visível usa o mesmo campo |
| 10 | Sidebar | Filtros salvos em **seção própria**, com o próprio id. Sem pseudo-projeto de id negativo (Vikunja) |
| 11 | View do filtro | Só **List**. A ordenação vai pela URL (#7) |
| 12 | Ordem | Prazo crescente, sem prazo no fim, desempate por id |
| 13 | Rolagem infinita | **Cursor (keyset)**, nunca OFFSET: uma tarefa concluída entre duas páginas não faz outra pular nem repetir. Página de 50. Cursor = `base64url([chave, id])`; o cursor forjado é recusado com 400. Nas views com `position REAL` o mesmo esquema vale com a chave `(position, id)` |

## Achado: formato canônico de instante é requisito

O teste de "Hoje" falhou para um prazo gravado como `…T02:59:59Z` contra o limite
`…T02:59:59.999Z`: como texto, `'Z'` (0x5A) > `'.'` (0x2E), e o prazo caía fora do dia.
Comparar ISO-8601 como texto só funciona com **um formato só**. A migração `001`
ganhou `CHECK ... GLOB` em `due_date`, `done_at`, `start_date` e `end_date`,
que exige o formato de `Date.toISOString()` (sempre com milissegundos, sempre `Z`).
A `001` foi editada no lugar porque ainda não existe banco em produção. **Daqui em
diante, mudança de schema é migração nova.**

## Verificação

- `src/lib/server/filtro.test.ts` (6 testes): cada smart list pega exatamente as
  suas tarefas, incluindo as bordas 00:30 e 23:59:59.999 do dia local;
  combinações por AND; texto com sintaxe FTS5 e SQL não quebra nem executa;
  o cursor percorre 126 tarefas sem repetir nem pular; o `parseFiltro` recusa 15
  formas erradas; o cursor forjado é recusado.
- `schema.test.ts`: um instante fora do formato canônico é recusado pelo banco.
- Imagem no **Docker local** com `TZ=America/Sao_Paulo`: `/api/tarefas` sem
  sessão → 401; Hoje e Atrasadas corretas; Abertas em páginas de 50 + 12 com
  cursor final nulo; filtro salvo por texto acha "herbário" buscando "herbario";
  um filtro salvo com campo desconhecido → 400; `lista=__proto__` → 400.

## O que ficou de fora e quando volta

- OR e grupos: quando um filtro real não couber em AND. O formato tem `v` para isso.
- Busca em comentários: incluir `comments.body` num segundo índice FTS5.
- Table como view de filtro: quando o protótipo #15 pedir.
- Criar e editar filtro salvo (POST/PATCH): no protótipo #15, sempre via `parseFiltro`.
