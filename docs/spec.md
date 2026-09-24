# projMan — especificação funcional v1

> O que o app faz, visto por quem usa. Não é o "como": para arquitetura, ver
> os ADRs e o C4; para o schema exato, ver `migrations/001_inicial.sql`.
> Cada seção liga para a decisão de origem em `docs/decisoes/`.

## 1. Visão geral

projMan é um gestor de Projetos e Tarefas de **uso próprio**: um usuário só,
sem convite, sem equipe. É inspirado nas funcionalidades do
[Vikunja](https://github.com/go-vikunja/vikunja), não no seu stack.

Roda em container no UNRAID do usuário, exposto pela internet por
**Cloudflare Tunnel**, sem porta aberta no roteador. O acesso exige login;
existe também um modo de leitura pública, por projeto, através de um
Link Público (seção 8).

(`docs/proximosPassos.md`, issue #1)

## 2. Entidades

### Projeto

Contém Tarefas. Tem título, descrição, cor e uma ordem na sidebar (arrastável).
Pode ficar **arquivado**: some das Smart Lists, do Filtro Salvo e do feed
iCal, mas continua acessível pela sidebar, numa seção "Arquivados" recolhida.
Apagar um Projeto é definitivo — sem lixeira — e leva junto tudo o que
depende dele (Tarefas, Views, Buckets, Comentários, Anexos, Link Público).

### Tarefa

Pertence a um Projeto. Campos: título, descrição (texto rico), Prazo
(seção 3), data de início e de fim (uso futuro, Gantt), prioridade (nenhuma,
baixa … agora, seis níveis), Recorrência (seção 3), Labels, Subtarefas,
Comentários, Anexos. Fica marcada como feita por um único caminho —
o checkbox ou o drop no Bucket "Feito" — que trata a Recorrência junto.

### Subtarefa

Uma Tarefa com uma Tarefa-mãe, no **mesmo Projeto**. Só um nível: uma
Subtarefa não pode ter Subtarefas próprias, e uma Tarefa com Subtarefas não
vira Subtarefa de outra. Em listas filtradas aparece solta, com o título da
mãe ao lado — nunca escondida dentro da mãe.

### Label

Global ao app, não por Projeto. Título único (sem diferenciar maiúsculas) e
cor. Uma Tarefa pode ter várias.

### View

Cada Projeto tem exatamente três: **List**, **Kanban** e **Table**. Não há
como criar, renomear ou apagar uma View — são fixas. (`07-views-buckets.md`)

### Bucket (coluna)

As colunas do Kanban. Um Projeto novo nasce com **A fazer / Fazendo / Feito**.
Só manuais — não há Bucket automático por regra. O Bucket "Feito" é
bidirecional com o estado "feita" da Tarefa: mover uma Tarefa para lá marca
ela como feita, e marcar feita em qualquer View move o card para lá. Um
Bucket pode ter um limite de trabalho em progresso (WIP): passar do limite
só acende um aviso, nunca bloqueia o drop. (`07-views-buckets.md`)

### Comentário

Texto rico numa Tarefa, com data. Não aparece no Link Público.

### Anexo

Arquivo ligado a uma Tarefa, até 25 MB. O nome de exibição é o do arquivo
original; o nome de armazenamento é gerado pelo servidor. Não aparece no
Link Público.

### Filtro Salvo

Um filtro nomeado, guardado à parte das Tarefas, reaproveitável na sidebar.
Formato exato: seção 5.

### Smart List

Um Filtro Salvo pré-definido pelo app, fixo, sem edição. As cinco: seção 4.

### Link Público

Um endereço de leitura, um por Projeto, sem senha: `GET /share/<hash>`
(hash de 40 caracteres). Read-only por construção — nunca aceita escrita,
mesmo por engano de código. Detalhe: seção 8.

(`09-schema.md`)

## 3. Regras de data e Recorrência

- Todo instante do app usa o fuso do **servidor** (`TZ`), nunca um fuso do
  navegador do usuário. Um app de uma pessoa só não precisa de dois relógios.
- Um Prazo pode ser **dia inteiro** (padrão) ou ter hora. Dia inteiro conta
  até o fim daquele dia civil no fuso do servidor.
- "Hoje" é o dia civil corrente no fuso do servidor, do início à meia-noite
  seguinte. Toda regra de Prazo — Smart Lists, feed iCal — usa essa mesma
  fronteira de dia.
- Uma Tarefa **atrasada** é a que tem Prazo antes do início de hoje. Uma
  Tarefa que vence hoje, mesmo com a hora já passada, fica em "Hoje", nunca
  em "Atrasadas".
- **Recorrência**: intervalo (todo N dias/semanas/meses/anos), calculado a
  partir do **Prazo anterior** — nunca da data em que a Tarefa foi marcada
  feita. 31 de janeiro + 1 mês vira 28 (ou 29) de fevereiro: o dia de origem
  não volta nos ciclos seguintes.
- Uma Recorrência muito atrasada (vários ciclos vencidos) pula direto para a
  **próxima ocorrência futura**; não acumula instâncias passadas.
- Marcar uma Tarefa recorrente como feita avança o Prazo da mesma linha,
  reabre as Subtarefas diretas e volta o card ao Bucket padrão — não cria
  uma Tarefa nova a cada ciclo.

(`08-datas-fuso-recorrencia.md`)

## 4. Smart Lists

As cinco, exatamente, sem adicionar nem tirar. Todas mostram só Tarefas em
aberto, de Projetos não arquivados:

| Smart List | Janela |
|---|---|
| **Hoje** | Prazo dentro do dia civil de hoje (início a fim, fuso do servidor) |
| **7 dias** | Prazo do início de hoje até o fim do 7º dia seguinte |
| **Atrasadas** | Prazo antes do início de hoje |
| **Sem prazo** | Nenhum Prazo definido |
| **Todas as abertas** | Toda Tarefa não feita, de qualquer Projeto ativo |

Nenhuma janela se sobrepõe a outra: uma Tarefa que vence hoje nunca aparece
em Atrasadas, e uma sem Prazo nunca aparece em Hoje ou 7 dias.
(`11-smart-lists-filtro.md`)

## 5. Filtro Salvo

Um Filtro Salvo é montado por um formulário — sem linguagem de consulta em
texto — e guardado como um destes campos, todos opcionais:

| Campo | Significado |
|---|---|
| `estado` | abertas (padrão) ou feitas |
| `projetos` | lista de Projetos |
| `labels.in` | tem pelo menos uma dessas Labels |
| `labels.notIn` | não tem nenhuma dessas Labels |
| `labels.nenhuma` | não tem **Label alguma** (incompatível com `labels.in`) |
| `prioridadeMin` | prioridade igual ou acima de um nível ("alta ou urgente" é uma faixa, não um "ou") |
| `prazo` | atrasadas, hoje, sem prazo, ou "nos próximos N dias" |
| `criadaHaMaisDe` | criada há mais de N dias (1 a 3650) |
| `texto` | busca por palavra no título e na descrição |

Todas as condições preenchidas valem **juntas** (E lógico); não há "ou" nem
agrupamento entre campos — os quatro casos reais do usuário couberam nisso.
Um campo desconhecido no filtro é rejeitado, nunca ignorado. Um Filtro Salvo
só tem a View List; a ordenação é a mesma das outras listas.
(`11-smart-lists-filtro.md`, `15-filtro-salvo.md`)

## 6. Views

### List e Table

Ordem manual, arrastável, independente por View. A Table tem colunas fixas:
título, Prazo, prioridade, Labels, feita — sem escolher colunas.

### Kanban

Cards nos Buckets da coluna. Arrastar funciona com mouse e com toque (toque
exige pressão de cerca de ¼ segundo antes de puxar o card, para não brigar
com o gesto de rolar a tela). Soltar um card no Bucket "Feito" marca a
Tarefa como feita (bidirecional, seção 2). Passar do limite de WIP de um
Bucket só acende um aviso — nunca impede o drop. Sem rolagem por coluna: o
Kanban carrega todos os cards da View de uma vez.

Em toda View, se a mutação falhar por falta de rede, o card ou a linha volta
ao lugar de antes e uma faixa de erro aparece — sem repetir a ação sozinho.

(`07-views-buckets.md`, `16-kanban.md`)

## 7. Interface

- **Navegação**: sidebar fixa no desktop, com Smart Lists, Projetos (com a
  seção "Arquivados" recolhida ao final), Filtros Salvos e a alternância de
  tema. No celular vira uma gaveta (drawer), aberta por um botão.
- **Linha da lista**: uma linha por Tarefa — checkbox, faixa de cor da
  prioridade, título, chips de Label, progresso de Subtarefas ("☑ n/m"),
  nome do Projeto (só fora da tela de um Projeto) e Prazo (em vermelho se
  atrasado).
- **Detalhe**: painel lateral com URL própria (`?tarefa=<id>`), então dá
  para compartilhar o link internamente e voltar fecha o painel. No celular
  ocupa a tela inteira.
- **Criação rápida**: no desktop, campo no topo da lista mais a data; Enter
  cria a Tarefa. No celular, um botão flutuante abre uma folha com título,
  Projeto, Prazo e prioridade.
- **Rolagem**: infinita em toda lista — nunca paginação com números de
  página.
- **Estado vazio**: texto centrado com o nome da lista e a instrução de
  criar.
- **Carregando**: linhas esqueleto, nunca um spinner de página inteira.
- **Sem rede numa escrita**: a UI reverte a mudança visual e mostra um aviso
  inline; não tenta de novo sozinha.
- **Tema**: claro/escuro segue a preferência do sistema por padrão, com uma
  alternância manual que fica guardada no navegador. Visual: tema padrão do
  shadcn-svelte (base neutra), fonte do sistema — sem tokens de design
  próprios no v1.

(`14-shell.md`, ticket #17)

## 8. Compartilhamento público

Cada Projeto pode ter um Link Público (`GET /share/<hash>`), sem login.
Mostra: título e estado do Projeto e das Tarefas (feitas aparecem riscadas),
Prazo, Labels, descrição e Subtarefas. **Não mostra** Comentários nem
Anexos — ficam privados. A página tem `noindex`, para não entrar em buscador.
Um hash inexistente ou malformado responde igual (404), sem confirmar se o
link já existiu. Revogar é apagar o link: some para sempre, sem prazo de
validade nem forma de reativar o mesmo endereço. Favoritar um Projeto para
acesso rápido fica fora do v1.

(`10-autenticacao.md`, ticket #17)

## 9. Feed iCal

Um feed único para todo o app (não por Projeto): `GET /ical/<token>`. Sem
o token configurado, a rota nem existe (404). Contém as Tarefas em aberto,
com Prazo, de Projeto ativo — cada Subtarefa entra como evento próprio.
Tarefa feita ou apagada some do feed no próximo carregamento do calendário.
Uma Tarefa recorrente mostra só o **próximo** Prazo, nunca os ciclos
futuros. O feed não traz descrição da Tarefa, Comentários nem Anexos.
Revogar o feed é trocar o token e reiniciar o app.

(`12-ical-export.md`)

## 10. Export e restauração

`GET /api/export`, com sessão, baixa um pacote `.tar.gz` com uma cópia
consistente do banco inteiro e os arquivos dos Anexos em uso — nada é salvo
no servidor, só baixado. É o backup manual, e também o caminho de
restauração: não existe um "importar" dentro do app. Restaurar é parar o
container, trocar o banco e a pasta de arquivos pelos do pacote, e subir de
novo (`docs/instalacao.md` tem o passo a passo).

(`12-ical-export.md`)

## 11. Backup e atualização

- **Backup automático**: fora do app, pelo plugin *Appdata Backup* do
  UNRAID, sobre os dois volumes do container. O app não tem agendador
  próprio.
- **Backup manual**: o export da seção 10, o único caminho seguro para
  copiar o banco com o container no ar.
- **Atualização**: a imagem publicada segue a tag `latest`; atualizar é o
  *Check for Updates* do UNRAID. A migração de banco roda sozinha na
  subida, dentro de uma transação.
- **Volta atrás**: antes de aplicar uma migração num banco já em uso, o app
  grava uma cópia da versão anterior. Reverter é escolher a imagem anterior
  (pela tag do commit) e trocar de volta essa cópia.

(`13-backup-atualizacao.md`)

## 12. PWA

Instalável no celular e no desktop, com ícone e tela cheia. Funciona
**offline para leitura**: o que já foi carregado fica disponível sem rede.
Qualquer escrita — criar, editar, mover, marcar feita — exige rede; sem
ela, falha na hora com um aviso, sem fila de sincronização. Não existe um
motor de sincronização no v1.

(`proximosPassos.md`, "Decisões já fechadas")

## 13. Autenticação

- Login por senha única, sem cadastro de usuário. Sessão dura **30 dias
  fixos**; não há "manter conectado" nem renovação automática além disso.
- Errar a senha 5 vezes pelo mesmo IP em 15 minutos bloqueia novas
  tentativas por um tempo (a mensagem de erro nunca diz qual dos dois
  campos falhou, ainda que só exista o de senha).
- `POST /logout` encerra a sessão do dispositivo atual.
- Toda página e toda chamada da API exigem sessão, exceto o login, o Link
  Público e a checagem de saúde do app.

(`10-autenticacao.md`)

## 14. Limites

- **Anexo**: até 25 MB por arquivo.
- **Apagar é definitivo**: Projeto, Tarefa, Comentário, Label, Anexo — nenhum
  tem lixeira nem prazo de retenção. Um Projeto tem o arquivamento como
  alternativa a apagar (seção 2); o export (seção 10) é a rede de segurança.
- **Só português (pt-BR)** no v1: os textos da interface ficam direto nos
  componentes, sem arquivo de tradução. Uma segunda língua, se um dia
  existir, paga o custo de extrair essas strings depois.

(ticket #17, `.env.example`, `09-schema.md`)

## 15. Fora do v1

- **Web Push** para lembretes (fica para depois; as Smart Lists são o
  mecanismo de hoje).
- **Gantt**, junto com relações do tipo "bloqueada por" entre Tarefas.
- **Multiusuário**, equipes, convites, permissões por pessoa, responsável
  (assignee) de Tarefa.
- **Favoritos de Projeto**.
- **OR / agrupamento** no Filtro Salvo — só E (AND) no v1.
- CalDAV, webhooks, tokens de API, notificação por e-mail.
- Importadores de outras ferramentas (Todoist, Trello, MS To-Do, Vikunja).
- Imagem de fundo por Projeto, "Quick Add Magic" (sintaxe mágica no campo de
  criação).
- Escrita offline / local-first.

(ticket #1 "Out of scope", ticket #17)

## 16. Requisito → decisão de origem

| Requisito | Origem |
|---|---|
| Usuário único, sem teams/assignees | issue #1 "Decisions so far" |
| Views fixas, Buckets manuais, done bidirecional, WIP sinaliza | `docs/decisoes/07-views-buckets.md` |
| Fuso do servidor, dia inteiro, Recorrência pelo Prazo anterior | `docs/decisoes/08-datas-fuso-recorrencia.md` |
| Schema, apagar físico, Subtarefa em um nível | `docs/decisoes/09-schema.md` |
| Sessão 30 dias, rate limit, Link Público read-only estrutural | `docs/decisoes/10-autenticacao.md` |
| Cinco Smart Lists, formato do Filtro Salvo, busca por texto | `docs/decisoes/11-smart-lists-filtro.md` |
| Feed iCal, export `.tar.gz` | `docs/decisoes/12-ical-export.md` |
| Backup pelo Appdata Backup, atualização por `latest`, snapshot antes de migrar | `docs/decisoes/13-backup-atualizacao.md` |
| Shell: sidebar/drawer, painel de detalhe, criação rápida | `docs/decisoes/14-shell.md` |
| `labels.nenhuma`, `criadaHaMaisDe` no Filtro Salvo | `docs/decisoes/15-filtro-salvo.md` |
| Posição por ponto médio, SortableJS, sem virtualização | `docs/decisoes/16-kanban.md` |
| Arquivamento na sidebar, tema shadcn-svelte, limite de Anexo, sem i18n, sem lixeira | issue #17 (este ticket) |
| PWA leitura offline, escrita exige rede | `docs/proximosPassos.md`, "Decisões já fechadas" |
| Fora de escopo (Gantt, multiusuário, Web Push, importadores…) | issue #1 "Out of scope" |
