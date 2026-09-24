import { error, json } from '@sveltejs/kit';
import { Invalido, criarComentario, listarComentarios } from '$lib/server/comentarios';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** GET /api/tarefas/<id>/comentarios → lista em ordem de criação. */
export const GET: RequestHandler = ({ params }) => {
	const taskId = Number(params.id);
	if (!Number.isInteger(taskId) || taskId <= 0) error(400, 'id inválido.');
	const comentarios = listarComentarios(db, taskId);
	if (comentarios === false) error(404, 'tarefa não existe.');
	return json(comentarios);
};

/** POST /api/tarefas/<id>/comentarios {body} → {id}. `body` (HTML do EditorRico) passa por `sanitizar`. */
export const POST: RequestHandler = async ({ params, request }) => {
	const taskId = Number(params.id);
	if (!Number.isInteger(taskId) || taskId <= 0) error(400, 'id inválido.');
	const req = await request.json().catch(() => null);
	if (!req || typeof req !== 'object') error(400, 'JSON inválido.');
	try {
		const id = criarComentario(db, taskId, (req as Record<string, unknown>).body);
		if (id === false) error(404, 'tarefa não existe.');
		return json({ id }, { status: 201 });
	} catch (e) {
		if (e instanceof Invalido) error(400, e.message);
		throw e;
	}
};
