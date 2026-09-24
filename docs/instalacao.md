# projMan — instalação e operação

Imagem: `ghcr.io/edalcin/projman`. Voltar ao [README](../README.md).

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

Variáveis de ambiente (ver [`.env.example`](../.env.example)):

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

**Acesse sempre pela URL do `ORIGIN`** (ex.: `https://projman.exemplo.com`), não
pelo IP da LAN (`http://192.168.x.x:8426`, o botão WebUI do UNRAID). Pelo IP, o
login falha com "Cross-site POST form submissions are forbidden": a origem não
bate com `ORIGIN`, e o cookie de sessão é `Secure`, então o navegador não o
guarda em HTTP. Pela LAN, use a mesma URL pública (o túnel resolve).

Saúde do container: `GET /api/saude` — confirma que os dois volumes estão
graváveis. É o que o `HEALTHCHECK` da imagem chama.

## Feed de calendário

Com `ICAL_TOKEN` definido, o feed fica em `https://projman.exemplo.com/ical/<ICAL_TOKEN>`.
Para revogar o link, troque `ICAL_TOKEN` e reinicie.

## Export e restauração

`GET /api/export` (com sessão) baixa `projman-AAAA-MM-DD.tar.gz` com:

- `projman.db` — snapshot consistente do banco (abre no DB Browser for SQLite);
- `files/` — os anexos que o banco referencia.

Não há import pela app. Para restaurar: pare o container, descompacte
(`tar -xzf projman-….tar.gz`), copie `projman.db` para a pasta de `DB_PATH`
(apague `projman.db-wal` e `projman.db-shm` se existirem) e o conteúdo de
`files/` para a pasta de `FILES_PATH`. Suba o container.

## Backup automático

Use o plugin **Appdata Backup** (Community Applications). Ele **para o container**
antes de copiar, e só assim a cópia de um SQLite em WAL é segura. Configure:

- pasta de origem: `/mnt/cache/appdata/projman` (o `DB_PATH`);
- em *Include extra files/folders*: a pasta de `FILES_PATH`;
- agendamento semanal (ou diário), com retenção a seu gosto.

Nunca copie `projman.db` com o container no ar por `cp`/`rsync`: a cópia pode
sair corrompida. Com o container no ar, o caminho seguro é o `/api/export`.

## Atualização e volta atrás

O template usa a tag `latest`. Para atualizar: Docker → *Check for Updates* →
*apply update*. As migrações rodam no boot. Antes de migrar, o app grava
`projman.db.v<N>.bak` (a versão anterior) ao lado do banco.

Para voltar atrás depois de uma migração:

1. Pare o container.
2. Em *Repository*, troque `latest` pelo SHA curto da versão anterior
   (lista em `github.com/edalcin/projman/pkgs/container/projman`).
3. Na pasta de `DB_PATH`, apague `projman.db-wal` e `projman.db-shm` e renomeie
   `projman.db.v<N>.bak` para `projman.db`. Escrita feita depois da atualização se perde.
4. Suba o container.

Apague os `.bak` antigos à mão quando quiser.
