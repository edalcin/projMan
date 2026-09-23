# Anexos em disco, fora do banco SQLite

**Status:** Aceito, 2026-09-23

## Contexto

Anexo de arquivo na Tarefa precisa conviver com um banco SQLite em modo WAL, sem inflar o arquivo do banco nem competir por I/O com ele, e com um caminho de export/backup coerente.

## Decisão

Os bytes do arquivo vivem em `FILES_PATH` (segundo volume Docker, separado de `DB_PATH`); o nome no disco (`stored_name`) é gerado pelo servidor, nunca vem do cliente. A tabela `attachments` guarda só metadados — `id`, `task_id`, `file_name`, `stored_name UNIQUE`, `mime`, `size`, `created_at` (`migrations/001_inicial.sql`, linhas 124–132). No boot, uma varredura compara o conteúdo de `FILES_PATH` com as linhas de `attachments` e remove órfãos. O export (`GET /api/export`) junta os dois: `projman.db` (via `VACUUM INTO`) + `files/<stored_name>` de cada Anexo referenciado, num único `.tar.gz`.

## Consequências

### Positivas

- O banco fica pequeno e amigável ao WAL: escrita de arquivo grande nunca passa pelo caminho de escrita do SQLite.
- `FILES_PATH` pode ficar num share comum (não exige WAL), enquanto `DB_PATH` fica no mountpoint físico do pool — a armadilha de corrupção do FUSE não se aplica aos anexos.
- Um único export continua capturando um retrato consistente dos dois.

## Alternativas descartadas

- **BLOB no SQLite**: acopla I/O binário grande ao arquivo do banco sob WAL, na contramão da exigência de `DB_PATH` no mountpoint físico do pool.

## Origem

Issues [#9](https://github.com/edalcin/projMan/issues/9), [#12](https://github.com/edalcin/projMan/issues/12). Mapa (`gh issue view 1`, "Persistência"). Detalhe: `docs/decisoes/09-schema.md`, `docs/decisoes/12-ical-export.md`. Schema: `migrations/001_inicial.sql` (tabela `attachments`, linhas 124–132).
