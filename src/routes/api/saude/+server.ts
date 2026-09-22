import { env } from '$env/dynamic/private';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

// Se o banco não abre, este módulo falha ao carregar e a rota responde 500;
// o HEALTHCHECK trata qualquer resposta não-OK como falha.
export async function GET() {
	let files = 'ok';
	try {
		await access(env.FILES_PATH ?? '/files', constants.W_OK);
	} catch (e) {
		files = (e as Error).message;
	}
	const ok = files === 'ok';
	return json(
		{ ok, checks: { db: `ok (schema v${db.pragma('user_version', { simple: true })})`, files } },
		{ status: ok ? 200 : 503 }
	);
}
