# projMan

Sistema de gestão de projetos e tarefas de uso próprio, auto-hospedado no UNRAID.
Estado: planejamento. Veja [`docs/proximosPassos.md`](docs/proximosPassos.md).

Stack: SvelteKit (`adapter-node`) + SQLite. Imagem em `ghcr.io/edalcin/projman`.

## Desenvolvimento

```sh
npm install
npm run dev
```

## Instalação no UNRAID (Docker → Add)

> **Aviso.** `DB_PATH` precisa ficar no **mountpoint físico do pool**
> (`/mnt/cache/appdata/projman`), **nunca** no share FUSE (`/mnt/user/...`).
> O FUSE não entrega a memória compartilhada que o modo WAL do SQLite exige, e o
> resultado é banco corrompido. Anexos podem ficar no share.

Opção A — copie `deploy/unraid/my-projMan.xml` para
`/boot/config/plugins/dockerMan/templates-user/` no servidor; o template aparece
em Docker → Add Container → Template.

Opção B — preencha à mão em **Docker → Add Container**:

| Campo | Valor |
|---|---|
| Repository | `ghcr.io/edalcin/projman:latest` |
| Network Type | `Bridge` |
| Port | Container `3000` → Host `8426` |
| Path | Container `/data` → Host `/mnt/cache/appdata/projman` (rw) |
| Path | Container `/files` → Host `/mnt/user/Storage/appsdata/projman/files` (rw) |

Variáveis de ambiente (ver [`.env.example`](.env.example)):

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `DB_PATH` | `/data/projman.db` | sim |
| `FILES_PATH` | `/files` | sim |
| `ADMIN_PASSWORD_HASH` | saída de `node scripts/hash-senha.ts` | sim |
| `SESSION_SECRET` | saída de `openssl rand -base64 48` (mín. 32 chars) | sim |
| `ORIGIN` | `https://projman.exemplo.com` | sim |
| `ADDRESS_HEADER` | `CF-Connecting-IP` | atrás do Cloudflare Tunnel |
| `TZ` | `America/Sao_Paulo` | não |
| `BODY_SIZE_LIMIT` | `26214400` | não |
| `ICAL_TOKEN` | saída de `openssl rand -hex 20` (mín. 32 chars) | não — sem ela o feed iCal não existe |

Sem `ADMIN_PASSWORD_HASH` ou `SESSION_SECRET` válidos o container **não sobe** — de propósito.
Para derrubar todas as sessões abertas, troque `SESSION_SECRET` e reinicie.

`ORIGIN` precisa ser a URL pública exata. Sem ela, a proteção de CSRF do
SvelteKit responde 403 a todo POST atrás do túnel.

Saúde do container: `GET /api/saude` — confirma que os dois volumes estão
graváveis. É o que o `HEALTHCHECK` da imagem chama.

## Feed de calendário

Com `ICAL_TOKEN` definido, assine `https://projman.exemplo.com/ical/<ICAL_TOKEN>`
no Google Calendar (Outras agendas → Por URL) ou em qualquer cliente iCal. O feed
mostra toda tarefa aberta com prazo como evento; feita ou apagada some na próxima
atualização do cliente. Para revogar o link, troque `ICAL_TOKEN` e reinicie.

## Export e restauração

`GET /api/export` (com sessão) baixa `projman-AAAA-MM-DD.tar.gz` com:

- `projman.db` — snapshot consistente do banco (abre no DB Browser for SQLite);
- `files/` — os anexos que o banco referencia.

Não há import pela app. Para restaurar: pare o container, descompacte
(`tar -xzf projman-….tar.gz`), copie `projman.db` para a pasta de `DB_PATH`
(apague `projman.db-wal` e `projman.db-shm` se existirem) e o conteúdo de
`files/` para a pasta de `FILES_PATH`. Suba o container.
