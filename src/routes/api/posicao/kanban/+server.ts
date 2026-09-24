import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { moverKanban } from '$lib/server/views';
import { TZ } from '$lib/server/tz';
import type { RequestHandler } from './$types';

const inteiro = (x: unknown) => (Number.isSafeInteger(x) && (x as number) > 0 ? (x as number) : undefined);
const posicao = (x: unknown) => (x === null ? null : Number.isFinite(x) ? (x as number) : undefined);

/**
 * POST /api/posicao/kanban {task_id, bucket_id, antes, depois} (#6): move um
 * card entre/dentro de colunas do Kanban. Entrar no bucket de feitas marca a
 * tarefa feita; sair dele reabre (pelo ponto único `marcarFeita`); depois
 * grava a posição exata do drop.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const task_id = inteiro(body?.task_id);
	const bucket_id = inteiro(body?.bucket_id);
	const antes = posicao(body?.antes ?? null);
	const depois = posicao(body?.depois ?? null);
	if (task_id === undefined || bucket_id === undefined || antes === undefined || depois === undefined)
		error(400, 'task_id, bucket_id obrigatórios; antes/depois número ou null');
	if (!moverKanban(db, { task_id, bucket_id, antes, depois }, { tz: TZ })) error(404, 'tarefa ou bucket não encontrado');
	return json({ ok: true });
};
