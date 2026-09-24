import { error, json } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { db } from '$lib/server/db';
import { type CamposTarefa, Invalido, apagarTarefa, atualizarTarefa, lerTarefa } from '$lib/server/tarefas';
import { TZ } from '$lib/server/tz';
import type { RequestHandler } from './$types';

function idValido(param: string | undefined): number {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) error(400, 'id inválido.');
	return id;
}

/** GET /api/tarefas/<id> → detalhe completo do painel (#14), 404 se não existe. */
export const GET: RequestHandler = ({ params }) => {
	const t = lerTarefa(db, idValido(params.id));
	if (!t) error(404, 'tarefa não existe.');
	return json(t);
};

// Só repassa as chaves que o cliente mandou: PATCH é parcial, campo ausente não muda nada.
function campos(b: Record<string, unknown>): CamposTarefa {
	const c: CamposTarefa = {};
	if ('title' in b) {
		if (typeof b.title !== 'string') throw new Invalido('title precisa ser texto.');
		c.title = b.title;
	}
	if ('due_date' in b) {
		c.due_date = typeof b.due_date === 'string' ? b.due_date : null;
		c.due_all_day = 'due_all_day' in b ? !!b.due_all_day : true;
	}
	if ('priority' in b) c.priority = Number(b.priority);
	if ('repeat_every' in b) c.repeat_every = b.repeat_every === null || b.repeat_every === undefined ? null : Number(b.repeat_every);
	if ('repeat_unit' in b) {
		const u = b.repeat_unit;
		if (u === null || u === undefined) c.repeat_unit = null;
		else if (u === 'day' || u === 'week' || u === 'month' || u === 'year') c.repeat_unit = u;
		else throw new Invalido('repeat_unit inválido.');
	}
	if ('labels' in b) {
		if (!Array.isArray(b.labels) || !b.labels.every((x) => typeof x === 'number')) throw new Invalido('labels precisa ser uma lista de ids.');
		c.labels = b.labels;
	}
	if ('project_id' in b) {
		const p = Number(b.project_id);
		if (!Number.isInteger(p) || p <= 0) throw new Invalido('project_id inválido.');
		c.project_id = p;
	}
	return c;
}

/**
 * PATCH /api/tarefas/<id> parcial → {ok:true}. Trocar de projeto refaz as
 * posições (List/Kanban); o trigger de subtarefa do schema vira 400 (#7).
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = idValido(params.id);
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'JSON inválido.');
	try {
		const ok = atualizarTarefa(db, id, campos(body as Record<string, unknown>), { tz: TZ });
		if (!ok) error(404, 'tarefa não existe.');
		return json({ ok: true });
	} catch (e) {
		if (e instanceof Invalido) error(400, e.message);
		if (e instanceof Database.SqliteError) error(400, e.message);
		throw e;
	}
};

/** DELETE /api/tarefas/<id> → 204. Físico, leva subtarefas junto (CASCADE, #9). */
export const DELETE: RequestHandler = ({ params }) => {
	if (!apagarTarefa(db, idValido(params.id))) error(404, 'tarefa não existe.');
	return new Response(null, { status: 204 });
};
