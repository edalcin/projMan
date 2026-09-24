import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { moverNaView } from '$lib/server/views';
import type { RequestHandler } from './$types';

const inteiro = (x: unknown) => (Number.isSafeInteger(x) && (x as number) > 0 ? (x as number) : undefined);
const posicao = (x: unknown) => (x === null ? null : Number.isFinite(x) ? (x as number) : undefined);

/**
 * POST /api/posicao/view {task_id, view_id, antes, depois} (#5): move uma
 * tarefa dentro da List/Table. `antes`/`depois` são as posições dos vizinhos
 * no ponto de solta (null = ponta); o servidor calcula `entre()` e renumera
 * a view se o vão ficar apertado demais.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const task_id = inteiro(body?.task_id);
	const view_id = inteiro(body?.view_id);
	const antes = posicao(body?.antes ?? null);
	const depois = posicao(body?.depois ?? null);
	if (task_id === undefined || view_id === undefined || antes === undefined || depois === undefined)
		error(400, 'task_id, view_id obrigatórios; antes/depois número ou null');
	if (!moverNaView(db, { task_id, view_id, antes, depois })) error(404, 'tarefa não está nessa view');
	return json({ ok: true });
};
