# #10 — Autenticação, sessão e garantias da rota pública

Decidido em 2026-09-22. Ticket [#10](https://github.com/edalcin/projMan/issues/10).
Bases: [#3](https://github.com/edalcin/projMan/issues/3) (sessão) e [#4](https://github.com/edalcin/projMan/issues/4) (sanitização).

## Decisões

| # | Questão | Decisão |
|---|---|---|
| 1 | Sessão | **Cookie assinado sem estado**: `<expira em ms>.<HMAC-SHA256>`. Não há tabela. Revogar = trocar `SESSION_SECRET` e reiniciar; com um usuário só, "todas as sessões" e "a sessão" são a mesma coisa |
| 2 | Variáveis | `ADMIN_PASSWORD_HASH` (`scrypt:N:r:p:sal:hash`, sem `$` para não brigar com shell/compose) e `SESSION_SECRET` (≥ 32 chars). **Faltou uma ou é inválida: o processo não sobe.** Uma instância no túnel sem senha é pior que uma fora do ar |
| 3 | Gerar o hash | `node scripts/hash-senha.ts`: lê a senha sem eco, nunca do argv. Aceita pipe. Exige ≥ 12 caracteres |
| 4 | Duração | **30 dias fixos**, sem "lembrar de mim": dispositivos são seus. Sem renovação deslizante |
| 5 | Cookie | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` automático fora de `http://localhost` (default do SvelteKit) |
| 6 | Rate limit | **5 falhas por IP em 15 min** → `429` com o tempo de espera. O IP vem de `ADDRESS_HEADER=CF-Connecting-IP`. Login certo zera o contador. A mensagem de erro é sempre "Senha incorreta" |
| 7 | Gate | O hook `handle` exige sessão em tudo, menos `/login`, `/share/*` e `/api/saude`. Página sem sessão → `303 /login?volta=…`. API sem sessão → `401` |
| 8 | Open redirect | `volta` só aceita caminho local (`/x`, nunca `//host` nem `https://`) |
| 9 | Logout | `POST /logout` só. Um GET seria disparável por `<img src>` de outra página |
| 10 | `/share/<hash>` read-only | **Estrutural + guarda central.** O grupo só tem `+page.server.ts` com `load`, sem action e sem `+server.ts`. O hook responde `405` a todo método que não seja GET/HEAD em `/share/*`, mesmo se alguém adicionar uma action ali |
| 11 | O que o link mostra | Título, estado (feitas riscadas), prazo, labels, descrição e subtarefas. **Não mostra comentários nem anexos**: são o diário privado da tarefa. `noindex` |
| 12 | Hash inexistente | `404`, igual ao hash malformado: não confirma existência de nada |
| 13 | Revogar link | **Apagar a linha.** Um link novo é um hash novo. Não há expiração |
| 14 | Anexos | Servidos só por rota autenticada (`/api/…`, atrás do gate). O arquivo em `FILES_PATH` tem `stored_name` gerado pelo servidor, nunca vem do cliente, e **não há servidor estático** sobre a pasta |
| 15 | Headers | Em **toda** resposta, inclusive 303/401/405: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (o hash do `/share` nunca vaza), `X-Frame-Options: DENY`, `Permissions-Policy`. HSTS fica no Cloudflare |
| 16 | CSP | `kit.csp` modo `auto` (nonce por request): `default-src 'self'`, `script-src 'self' + nonce`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`. O HTML do TipTap chega sanitizado (#4); `unsafe-inline` só cobre `style=` do Svelte |

## Invariante

O hook **monta** as respostas de bloqueio (`new Response`); não as lança com
`redirect()`/`error()`. Uma exceção sairia do hook antes dos headers de
segurança. Achado no teste: a primeira versão lançava, e 303/401/405 saíam
sem headers.

## Verificação

- `src/lib/server/auth.test.ts` (5 testes): senha certa/errada/malformada;
  sessão válida até expirar; validade adulterada e segredo rotacionado rejeitados;
  bloqueio na 5.ª falha e liberação no fim da janela; IPs isolados.
- Imagem no **Docker local**, fim a fim:
  - sem as variáveis → o container sai com a mensagem de erro;
  - `/` sem sessão → `303 /login`; `/api/x` → `401`; `/api/saude` → `200`;
  - senha errada → `400`; certa → `303` + cookie; `volta=//evil.com` → `/`;
  - cookie com validade adulterada → `303 /login`;
  - 6.ª tentativa do mesmo IP → `429`;
  - `/share/<hash>` → `200`, com tarefa e descrição, **sem** o comentário, `noindex`;
    POST/DELETE → `405`; hash inexistente → `404`;
  - CSP com nonce na página; headers de segurança em 303/401/405.

## O que ficou de fora e quando volta

- Tabela `sessions`: se houver mais de um usuário ou necessidade de revogar um dispositivo só.
- Expiração de link público: coluna `expires_at` em `link_shares`, se um link for dado a alguém de fora por tempo limitado.
- Rate limit distribuído: nunca com um processo só; varredura em massa se resolve no WAF do Cloudflare.
- 2FA/WebAuthn: o túnel pode pôr Cloudflare Access na frente, sem código aqui.
