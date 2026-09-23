# Senha única por variável de ambiente, sem tabela de usuários

**Status:** Aceito, 2026-09-23

## Contexto

projMan é de uso próprio, um usuário só. Autenticação não precisa de cadastro, múltiplas contas nem recuperação de senha por e-mail.

## Decisão

Uma identidade só, sem tabela `users`. Hash da senha em `ADMIN_PASSWORD_HASH` (`scrypt:N:r:p:sal:hash`, `node:crypto` com `N=131072, r=8, p=1`, comparado com `timingSafeEqual`). Sessão é um cookie assinado sem estado — `<expira em ms>.<HMAC-SHA256(SESSION_SECRET, expira)>` — sem tabela `sessions`. Faltando `ADMIN_PASSWORD_HASH` ou `SESSION_SECRET` (ou inválidos), o processo recusa subir.

## Consequências

### Positivas

- Nenhum armazenamento de usuário ou sessão para gerir, migrar ou vazar.
- Revogar toda sessão é trocar `SESSION_SECRET` e reiniciar.
- Nenhuma tela de cadastro, login múltiplo ou redefinição de senha para construir.

### Negativas

- Multiusuário, se algum dia entrar, exige tabela `users`, permissão por Projeto revisada em toda consulta, e uma migração grande — deliberadamente fora do v1, não antecipada no schema.
- Não há revogação por dispositivo: "todas as sessões" e "a sessão" são a mesma coisa.

## Alternativas descartadas

- **Tabela `users` + tabela `sessions`**: adiciona armazenamento e um caminho de migração para um recurso (multiusuário) fora de escopo no v1.
- **JWT sem revogação no servidor**: mesmo caminho sem estado do cookie HMAC, sem vantagem real para um usuário único.

## Origem

Issues [#3](https://github.com/edalcin/projMan/issues/3), [#10](https://github.com/edalcin/projMan/issues/10). Mapa (`gh issue view 1`, "Usuário único"). Detalhe: `docs/decisoes/10-autenticacao.md`. Config: `.env.example` (`ADMIN_PASSWORD_HASH`, `SESSION_SECRET`).
