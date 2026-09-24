# projMan — desenvolvimento

Voltar ao [README](../README.md).

Stack: SvelteKit (`adapter-node`) + shadcn-svelte + SQLite (`better-sqlite3`).
Imagem em `ghcr.io/edalcin/projman`, publicada pelo CI a cada push na `main`.

```sh
npm install
npm run dev     # dev server
npm test        # testes
npm run check   # svelte-check
npm run build   # build de produção
```

Variáveis: copie [`.env.example`](../.env.example) para `.env`.

## Documentos

| Documento | Conteúdo |
|---|---|
| [`spec.md`](spec.md) | O que o v1 faz |
| [`arquitetura.md`](arquitetura.md) | C4 (Context, Container, Component) em Mermaid |
| [`adr/`](adr/) | Decisões de arquitetura |
| [`decisoes/`](decisoes/) | Detalhe de cada decisão de planejamento |
| [`../CONTEXT.md`](../CONTEXT.md) | Glossário do domínio |
| [`proximosPassos.md`](proximosPassos.md) | Estado atual e próximo passo |
| [`instalacao.md`](instalacao.md) | Instalação no UNRAID e operação |
