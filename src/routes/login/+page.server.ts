import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import { bloqueadoPor, limparFalhas, registrarFalha } from '$lib/server/limite';
import { COOKIE, DURACAO_S, criarSessao } from '$lib/server/sessao';
import { verificarSenha } from '$lib/server/senha';
import type { Actions, PageServerLoad } from './$types';

// Só caminhos locais: `volta=//evil.com` ou `volta=https://...` viraria open redirect.
const destino = (volta: string | null) =>
	volta?.startsWith('/') && !volta.startsWith('//') ? volta : '/';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.autenticado) redirect(303, destino(url.searchParams.get('volta')));
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const ip = getClientAddress();
		const espera = bloqueadoPor(ip);
		if (espera) return fail(429, { erro: `Muitas tentativas. Tente de novo em ${Math.ceil(espera / 60)} min.` });

		const senha = (await request.formData()).get('senha');
		if (typeof senha !== 'string' || !(await verificarSenha(senha, env.ADMIN_PASSWORD_HASH!))) {
			registrarFalha(ip);
			return fail(400, { erro: 'Senha incorreta.' });
		}

		limparFalhas(ip);
		cookies.set(COOKIE, criarSessao(env.SESSION_SECRET!), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: DURACAO_S
		});
		redirect(303, destino(url.searchParams.get('volta')));
	}
};
