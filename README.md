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
| `ADMIN_PASSWORD_HASH` | hash `scrypt` da senha | sim |
| `ORIGIN` | `https://projman.exemplo.com` | sim |
| `ADDRESS_HEADER` | `CF-Connecting-IP` | atrás do Cloudflare Tunnel |
| `TZ` | `America/Sao_Paulo` | não |
| `BODY_SIZE_LIMIT` | `26214400` | não |

`ORIGIN` precisa ser a URL pública exata. Sem ela, a proteção de CSRF do
SvelteKit responde 403 a todo POST atrás do túnel.

Saúde do container: `GET /api/saude` — confirma que os dois volumes estão
graváveis. É o que o `HEALTHCHECK` da imagem chama.
