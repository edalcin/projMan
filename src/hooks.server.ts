import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { COOKIE, sessaoValida } from '$lib/server/sessao';

// Falha ruidosa (#10): sem senha ou sem segredo, o processo não sobe. Uma
// instância exposta pelo túnel sem senha seria pior que uma fora do ar.
if (!building) {
	if (!env.ADMIN_PASSWORD_HASH?.startsWith('scrypt:'))
		throw new Error('ADMIN_PASSWORD_HASH ausente ou inválido. Gere com: node scripts/hash-senha.ts');
	if ((env.SESSION_SECRET ?? '').length < 32)
		throw new Error('SESSION_SECRET ausente ou com menos de 32 caracteres. Gere com: openssl rand -base64 48');
}

// Rotas que não exigem sessão. Tudo o mais exige. /ical/ se protege pelo token.
const PUBLICAS = ['/login', '/share/', '/ical/', '/api/saude'];

// O CSP vem do kit.csp (vite.config.ts). HSTS fica no Cloudflare.
// same-origin: o hash do /share nunca vaza para um link externo. Não use
// no-referrer: com ele o browser manda `Origin: null` no POST de formulário, e a
// proteção de CSRF do SvelteKit recusa todo login (403 "Cross-site POST…").
const HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'same-origin',
	'X-Frame-Options': 'DENY',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;
	const publica = PUBLICAS.some((p) => pathname === p || (p.endsWith('/') && pathname.startsWith(p)));
	event.locals.autenticado = sessaoValida(event.cookies.get(COOKIE), env.SESSION_SECRET!);

	// Respostas montadas aqui, não lançadas com redirect()/error(): uma exceção
	// sairia do hook sem os headers de segurança.
	let resposta: Response;
	if (pathname.startsWith('/share/') && !['GET', 'HEAD'].includes(event.request.method)) {
		// Rota pública read-only por construção: o grupo /share só tem `load`, e
		// isto fecha qualquer outro método mesmo que alguém adicione uma action ali.
		resposta = new Response('somente leitura', { status: 405, headers: { Allow: 'GET, HEAD' } });
	} else if (!publica && !event.locals.autenticado) {
		resposta = pathname.startsWith('/api/')
			? new Response('não autenticado', { status: 401 })
			: new Response(null, {
					status: 303,
					headers: { Location: `/login?volta=${encodeURIComponent(pathname + search)}` }
				});
	} else {
		resposta = await resolve(event);
	}

	for (const [k, v] of Object.entries(HEADERS)) resposta.headers.set(k, v);
	return resposta;
};
