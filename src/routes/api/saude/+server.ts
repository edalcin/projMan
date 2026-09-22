import { env } from '$env/dynamic/private';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { json } from '@sveltejs/kit';

// ponytail: a saude so confere que os dois volumes estao gravaveis.
// Abrir o banco entra aqui quando o schema (#9) existir.
export async function GET() {
	const checks: Record<string, string> = {};
	for (const [nome, dir] of [
		['db', dirname(env.DB_PATH ?? '/data/projman.db')],
		['files', env.FILES_PATH ?? '/files']
	]) {
		try {
			await access(dir, constants.W_OK);
			checks[nome] = 'ok';
		} catch (e) {
			checks[nome] = (e as Error).message;
		}
	}
	const ok = Object.values(checks).every((v) => v === 'ok');
	return json({ ok, checks }, { status: ok ? 200 : 503 });
}
