import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { marcarFeita } from '$lib/server/tarefas';
import { TZ } from '$lib/server/tz';
import type { RequestHandler } from './$types';

/** POST /api/tarefas/<id>/feita {feita} → {ok:true}. Ponto único que escreve `done` (#7, #8). */
export const POST: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(400, 'id inválido.');
	const body: unknown = await request.json().catch(() => null);
	if (!body || typeof body !== 'object' || !('feita' in body)) error(400, 'feita precisa ser boolean.');
	if (typeof body.feita !== 'boolean') error(400, 'feita precisa ser boolean.');
	if (!marcarFeita(db, id, body.feita, { tz: TZ })) error(404, 'tarefa não existe.');
	return json({ ok: true });
};
