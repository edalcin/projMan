import { error, json } from '@sveltejs/kit';
import { Invalido, apagarComentario, atualizarComentario } from '$lib/server/comentarios';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

function ids(params: { id?: string; comentarioId?: string }): [number, number] {
	const taskId = Number(params.id);
	const id = Number(params.comentarioId);
	if (!Number.isInteger(taskId) || taskId <= 0 || !Number.isInteger(id) || id <= 0) error(400, 'id inválido.');
	return [taskId, id];
}

/** PATCH /api/tarefas/<id>/comentarios/<comentarioId> {body} → {ok:true}. */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const [taskId, id] = ids(params);
	const req = await request.json().catch(() => null);
	if (!req || typeof req !== 'object') error(400, 'JSON inválido.');
	try {
		if (!atualizarComentario(db, taskId, id, (req as Record<string, unknown>).body)) error(404, 'comentário não existe.');
		return json({ ok: true });
	} catch (e) {
		if (e instanceof Invalido) error(400, e.message);
		throw e;
	}
};

/** DELETE /api/tarefas/<id>/comentarios/<comentarioId> → 204. */
export const DELETE: RequestHandler = ({ params }) => {
	const [taskId, id] = ids(params);
	if (!apagarComentario(db, taskId, id)) error(404, 'comentário não existe.');
	return new Response(null, { status: 204 });
};
