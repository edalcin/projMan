import { error, json } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { db } from '$lib/server/db';
import { FiltroInvalido, listarTarefas, resolverFiltro } from '$lib/server/filtro';
import { Invalido, criarTarefa, normalizarPrazo } from '$lib/server/tarefas';
import { TZ } from '$lib/server/tz';
import type { RequestHandler } from './$types';

/**
 * GET /api/tarefas?lista=<smart>|filtro=<id>|projeto=<id>&cursor=<c>
 * Uma página (50) de tarefas; `cursor` na resposta pede a próxima (rolagem infinita).
 */
export const GET: RequestHandler = ({ url }) => {
	try {
		const r = resolverFiltro(db, url.searchParams);
		if (!r) error(400, 'use lista=<smart>, filtro=<id> ou projeto=<id>');
		return json(
			listarTarefas(db, r.filtro, { tz: TZ, arquivados: r.arquivados, cursor: url.searchParams.get('cursor') ?? undefined })
		);
	} catch (e) {
		if (e instanceof FiltroInvalido) error(400, e.message);
		throw e;
	}
};

function inteiro(x: unknown, campo: string, opcional = false): number | undefined {
	if (x === undefined || x === null) {
		if (opcional) return undefined;
		throw new Invalido(`${campo} é obrigatório.`);
	}
	const n = Number(x);
	if (!Number.isInteger(n) || n <= 0) throw new Invalido(`${campo} inválido.`);
	return n;
}

function titulo(x: unknown): string {
	const t = typeof x === 'string' ? x.trim() : '';
	if (!t || t.length > 200) throw new Invalido('title precisa ter de 1 a 200 caracteres.');
	return t;
}

/**
 * POST /api/tarefas {project_id, title, due_date?, due_all_day?, priority?, parent_task_id?} → 201 {id}
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	try {
		if (!body || typeof body !== 'object') throw new Invalido('JSON inválido.');
		const b = body as Record<string, unknown>;
		const project_id = inteiro(b.project_id, 'project_id')!;
		const title = titulo(b.title);
		const parent_task_id = inteiro(b.parent_task_id, 'parent_task_id', true) ?? null;
		let priority: number | undefined;
		if (b.priority !== undefined && b.priority !== null) {
			priority = Number(b.priority);
			if (!Number.isInteger(priority) || priority < 0 || priority > 5) throw new Invalido('priority precisa ser um inteiro de 0 a 5.');
		}
		const prazo = normalizarPrazo(b.due_date ?? null, b.due_all_day, TZ);
		const id = criarTarefa(db, {
			project_id,
			title,
			parent_task_id,
			due_date: prazo.due_date,
			due_all_day: !!prazo.due_all_day,
			priority
		});
		return json({ id }, { status: 201 });
	} catch (e) {
		if (e instanceof Invalido) error(400, e.message);
		if (e instanceof Database.SqliteError) error(400, e.message);
		throw e;
	}
};
