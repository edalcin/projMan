import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { Invalido, listarAnexos, salvarAnexo } from '$lib/server/anexos';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** GET /api/tarefas/<id>/anexos → lista em ordem de criação. */
export const GET: RequestHandler = ({ params }) => {
	const taskId = Number(params.id);
	if (!Number.isInteger(taskId) || taskId <= 0) error(400, 'id inválido.');
	const anexos = listarAnexos(db, taskId);
	if (anexos === false) error(404, 'tarefa não existe.');
	return json(anexos);
};

/** POST /api/tarefas/<id>/anexos, multipart (`file`) → {id}. Até 25 MB (#12, spec seção 14). */
export const POST: RequestHandler = async ({ params, request }) => {
	const taskId = Number(params.id);
	if (!Number.isInteger(taskId) || taskId <= 0) error(400, 'id inválido.');
	const form = await request.formData().catch(() => null);
	if (!form) error(400, 'multipart inválido.');
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'campo "file" obrigatório.');
	try {
		const id = await salvarAnexo(db, env.FILES_PATH ?? '/files', taskId, file);
		if (id === false) error(404, 'tarefa não existe.');
		return json({ id }, { status: 201 });
	} catch (e) {
		if (e instanceof Invalido) error(400, e.message);
		throw e;
	}
};
