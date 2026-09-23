# #14 — Protótipo do shell

Issue: [#14](https://github.com/edalcin/projMan/issues/14). Fechado em 2026-09-23.
Protótipo (fonte primária, fora da `main`): branch `prototipo/14-shell`, rota `/prototipo/shell?variant=A|B|C`.

Escolha do usuário: **variante A no desktop, com a criação de B no celular.**

| Tema | Decisão |
|---|---|
| Navegação | Sidebar fixa de 230 px: smart lists, projetos, filtros salvos, alternância de tema no pé. No celular (≤ 720 px) vira drawer, aberto pelo botão ☰ |
| Linha da lista | Uma linha só: checkbox inline, faixa de cor da prioridade, título (com reticências), chips de label, progresso de subtarefas `☑ n/m`, projeto (só fora de um projeto), prazo (vermelho se atrasado) |
| Detalhe | Painel lateral de 380 px à direita, com URL própria `?tarefa=<id>` (compartilhável, e o botão Voltar fecha). No celular o painel ocupa a tela inteira |
| Criação rápida, desktop | Campo no topo da lista mais um `<input type="date">`; Enter cria no projeto atual (numa smart list, no projeto padrão) |
| Criação rápida, celular | Botão flutuante `+` abre folha inferior: título, projeto, prazo, prioridade |
| Rolagem | Infinita, com sentinela `IntersectionObserver` (margem de 300 px) e o cursor keyset do #11 |
| Vazio | Texto centrado com o nome da lista e a instrução de criar |
| Carregando | Linhas esqueleto (skeleton) |
| Mutação sem rede | O controle volta ao estado anterior; faixa de erro inline acima da lista, fechável; sem retry automático (#5) |

Descartadas: B (abas embaixo + detalhe em página própria), porque no desktop desperdiça largura; C (tabela densa + modal), porque a Table view já cobre esse uso (#7) e o modal esconde a lista.

O código do protótipo não é promovido: a UI real se escreve com shadcn-svelte e Boxicons.
