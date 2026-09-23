# #17 — Consolidação da spec e fechamento do mapa

Issue: [#17](https://github.com/edalcin/projMan/issues/17). Fechado em 2026-09-23.

Artefatos: `docs/spec.md`, `docs/arquitetura.md`, `docs/adr/0001`–`0005`, `CONTEXT.md` e o backlog de build em `docs/proximosPassos.md`.

## O que restava em "Not yet specified" e como fechou

| Item | Decisão |
|---|---|
| Arquivamento de projeto | Projeto arquivado some das smart lists, dos filtros e do feed (#11, #12). Ele continua acessível numa seção "Arquivados", recolhida, na sidebar |
| Favoritos de projeto | Fora do v1. A ordem da sidebar é `projects.position` |
| Design visual | Tema padrão do shadcn-svelte (base neutra), fonte do sistema, sem tokens próprios. Layout e densidade conforme #14. Claro/escuro por `prefers-color-scheme` + alternância guardada em `localStorage` |
| Tamanho de anexo | 25 MB (`BODY_SIZE_LIMIT=26214400`, já no `.env.example`) |
| Lixeira e retenção | Não existem: apagar é físico (#9). Arquivar é a alternativa |
| i18n | Só pt-BR no v1, strings direto nos componentes |
| Web Push, Gantt, multiusuário, OR no filtro | Depois do v1 |
