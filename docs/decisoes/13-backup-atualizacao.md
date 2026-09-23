# #13 — Docker, CI, UNRAID: backup e política de atualização

Issue: [#13](https://github.com/edalcin/projMan/issues/13). Fechado em 2026-09-23.

O empacotamento (imagem, variáveis, migração no boot, CI, template, README) já
foi entregue em 2026-09-22 — ver `proximosPassos.md`, seção "Entrega de
empacotamento". Aqui ficam só os dois pontos que restavam.

## Backup

| Decisão | Por quê |
|---|---|
| Automático = plugin **Appdata Backup** do UNRAID sobre `DB_PATH`, com `FILES_PATH` em *extra folders* | Zero código. O plugin para o container antes de copiar, e isso torna segura a cópia de um SQLite em WAL |
| Manual = `/api/export` (#12) | Já existe; é o único caminho seguro com o container no ar (`VACUUM INTO`) |
| Sem export agendado dentro do app | Exigiria scheduler, destino e retenção no app. O plugin já faz os três |
| `cp`/`rsync` do banco com o container no ar: proibido no README | Cópia de WAL em uso pode sair corrompida |

## Atualização

| Decisão | Por quê |
|---|---|
| Template fica em `latest`; atualizar = *Check for Updates* do UNRAID | Uso próprio, um usuário: fixar SHA só adiciona passo manual a cada release |
| Migração continua automática no boot, cada uma em transação | Já implementado (#2/#9). Falha = banco na versão anterior e o processo sai; o healthcheck acusa |
| **Snapshot antes de migrar**: `migrar()` grava `<banco>.v<atual>.bak` por `VACUUM INTO` quando há migração pendente num banco já em uso | Migração é só para frente (sem `down`). O `.bak` é o ponto de volta; 4 linhas em vez de migrações reversas |
| Volta atrás = pôr o SHA curto anterior em *Repository* + renomear o `.bak` | As tags SHA já são publicadas pelo CI |
| Sem limpeza automática dos `.bak` | Um por versão de schema; poucos ao longo da vida do app |

Teste: `schema.test.ts` — "migrar grava snapshot da versão anterior antes de migrar banco em uso".

Adiado: rotação dos `.bak`, se o número de migrações crescer muito.
