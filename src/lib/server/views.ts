import type Database from 'better-sqlite3';
import { entre, MIN, PASSO } from './posicao.ts';
import { marcarFeita } from './tarefas.ts';

export type LabelDaTarefa = { id: number; title: string; hex_color: string | null };

export type Tarefa = {
	id: number;
	title: string;
	done: number;
	due_date: string | null;
	due_all_day: number;
	priority: number;
	parent_task_id: number | null;
	mae: string | null;
	labels: LabelDaTarefa[];
};

export type TarefaPosicionada = Tarefa & { position: number };

export type Bucket = { id: number; title: string; position: number; wip_limit: number; tarefas: TarefaPosicionada[] };

/** Junta as labels de cada tarefa numa única consulta (evita N+1). */
function comLabels<T extends { id: number }>(db: Database.Database, tarefas: T[]): (T & { labels: LabelDaTarefa[] })[] {
	if (!tarefas.length) return tarefas as (T & { labels: LabelDaTarefa[] })[];
	const ids = tarefas.map((t) => t.id);
	const linhas = db
		.prepare(
			`SELECT tl.task_id, l.id, l.title, l.hex_color FROM task_labels tl JOIN labels l ON l.id = tl.label_id
			 WHERE tl.task_id IN (${ids.map(() => '?').join(',')})`
		)
		.all(...ids) as { task_id: number; id: number; title: string; hex_color: string | null }[];
	const porTarefa = new Map<number, LabelDaTarefa[]>();
	for (const { task_id, ...l } of linhas) porTarefa.set(task_id, [...(porTarefa.get(task_id) ?? []), l]);
	return tarefas.map((t) => ({ ...t, labels: porTarefa.get(t.id) ?? [] }));
}

const idDaView = (db: Database.Database, projectId: number, kind: 'list' | 'kanban' | 'table') =>
	db.prepare(`SELECT id FROM project_views WHERE project_id = ? AND view_kind = ?`).pluck().get(projectId, kind) as
		| number
		| undefined;

/**
 * List da View do projeto (#5): ordem manual (`task_positions`), subtarefas
 * recuadas (mesma lista, indicadas por `parent_task_id`). `null` = projeto
 * inexistente (404 na rota).
 */
export function listarList(
	db: Database.Database,
	projectId: number,
	{ feitas = false }: { feitas?: boolean } = {}
): TarefaPosicionada[] | null {
	const view = idDaView(db, projectId, 'list');
	if (view === undefined) return null;
	const linhas = db
		.prepare(
			`SELECT t.id, t.title, t.done, t.due_date, t.due_all_day, t.priority, t.parent_task_id, m.title AS mae, tp.position
			 FROM task_positions tp
			 JOIN tasks t ON t.id = tp.task_id
			 LEFT JOIN tasks m ON m.id = t.parent_task_id
			 WHERE tp.project_view_id = ? AND t.done = ?
			 ORDER BY tp.position`
		)
		.all(view, feitas ? 1 : 0) as Omit<TarefaPosicionada, 'labels'>[];
	return comLabels(db, linhas);
}

const ORDEM_TABLE: Record<string, string> = {
	titulo: 't.title',
	prazo: "coalesce(t.due_date, '~')",
	prioridade: 't.priority DESC, t.id'
};

/** Table do projeto (#5): colunas fixas, ordenação pela URL (`?ordem=`), sem posição manual. */
export function listarTable(db: Database.Database, projectId: number, { ordem = 'prazo' }: { ordem?: string } = {}): Tarefa[] | null {
	if (idDaView(db, projectId, 'table') === undefined) return null;
	const criterio = ORDEM_TABLE[ordem] ?? ORDEM_TABLE.prazo;
	const linhas = db
		.prepare(
			`SELECT t.id, t.title, t.done, t.due_date, t.due_all_day, t.priority, t.parent_task_id, m.title AS mae
			 FROM tasks t
			 LEFT JOIN tasks m ON m.id = t.parent_task_id
			 WHERE t.project_id = ?
			 ORDER BY ${criterio}, t.id`
		)
		.all(projectId) as Omit<Tarefa, 'labels'>[];
	return comLabels(db, linhas);
}

/** Kanban do projeto (#6): buckets em ordem, cards por `task_buckets.position`. */
export function listarKanban(db: Database.Database, projectId: number): Bucket[] | null {
	const view = idDaView(db, projectId, 'kanban');
	if (view === undefined) return null;
	const buckets = db
		.prepare('SELECT id, title, position, wip_limit FROM buckets WHERE project_view_id = ? ORDER BY position')
		.all(view) as Omit<Bucket, 'tarefas'>[];
	const cards = comLabels(
		db,
		db
			.prepare(
				`SELECT t.id, t.title, t.done, t.due_date, t.due_all_day, t.priority, t.parent_task_id, m.title AS mae, tb.bucket_id, tb.position
				 FROM task_buckets tb
				 JOIN tasks t ON t.id = tb.task_id
				 LEFT JOIN tasks m ON m.id = t.parent_task_id
				 WHERE tb.project_view_id = ?
				 ORDER BY tb.position`
			)
			.all(view) as (Omit<TarefaPosicionada, 'labels'> & { bucket_id: number })[]
	);
	return buckets.map((b) => ({ ...b, tarefas: cards.filter((c) => c.bucket_id === b.id).map(({ bucket_id: _b, ...t }) => t) }));
}

/** Renumera (passo fixo) quando algum vão de `campo` ficou menor que MIN. */
function renumerarSeApertado(db: Database.Database, tabela: 'task_positions' | 'task_buckets', onde: string, params: unknown[]) {
	const linhas = db.prepare(`SELECT task_id, position FROM ${tabela} WHERE ${onde} ORDER BY position`).all(...params) as {
		task_id: number;
		position: number;
	}[];
	for (let i = 1; i < linhas.length; i++) {
		if (linhas[i].position - linhas[i - 1].position < MIN) {
			const set = db.prepare(`UPDATE ${tabela} SET position = ? WHERE task_id = ? AND ${onde}`);
			linhas.forEach((l, k) => set.run((k + 1) * PASSO, l.task_id, ...params));
			return;
		}
	}
}

/**
 * Move uma tarefa dentro da List/Table (#5): `antes`/`depois` são as posições
 * dos vizinhos no ponto de solta (null = ponta). Devolve false se a tarefa
 * não está nessa view (id inexistente ou view de outro projeto).
 */
export function moverNaView(
	db: Database.Database,
	{ task_id, view_id, antes, depois }: { task_id: number; view_id: number; antes: number | null; depois: number | null }
): boolean {
	return db.transaction(() => {
		const existe = db.prepare('SELECT 1 FROM task_positions WHERE task_id = ? AND project_view_id = ?').get(task_id, view_id);
		if (!existe) return false;
		db.prepare('UPDATE task_positions SET position = ? WHERE task_id = ? AND project_view_id = ?').run(
			entre(antes, depois),
			task_id,
			view_id
		);
		renumerarSeApertado(db, 'task_positions', 'project_view_id = ?', [view_id]);
		return true;
	})();
}

/**
 * Move um card no Kanban (#6). Entrar no bucket de feitas marca a tarefa
 * feita (`marcarFeita`); sair dele reabre — os dois pelo ponto único de
 * `tarefas.ts`, nunca escrevendo `done` aqui. Devolve false se o bucket não
 * existe ou a tarefa não está nesse Kanban.
 */
export function moverKanban(
	db: Database.Database,
	{ task_id, bucket_id, antes, depois }: { task_id: number; bucket_id: number; antes: number | null; depois: number | null },
	{ tz }: { tz: string }
): boolean {
	return db.transaction(() => {
		const bucket = db.prepare('SELECT project_view_id FROM buckets WHERE id = ?').get(bucket_id) as
			| { project_view_id: number }
			| undefined;
		if (!bucket) return false;
		const view = db.prepare('SELECT done_bucket_id FROM project_views WHERE id = ?').get(bucket.project_view_id) as
			| { done_bucket_id: number }
			| undefined;
		const bucketAtual = db
			.prepare('SELECT bucket_id FROM task_buckets WHERE task_id = ? AND project_view_id = ?')
			.pluck()
			.get(task_id, bucket.project_view_id) as number | undefined;
		if (!view || bucketAtual === undefined) return false;
		if (bucket_id === view.done_bucket_id && bucketAtual !== view.done_bucket_id) marcarFeita(db, task_id, true, { tz });
		else if (bucket_id !== view.done_bucket_id && bucketAtual === view.done_bucket_id) marcarFeita(db, task_id, false, { tz });
		db.prepare('UPDATE task_buckets SET bucket_id = ?, position = ? WHERE task_id = ? AND project_view_id = ?').run(
			bucket_id,
			entre(antes, depois),
			task_id,
			bucket.project_view_id
		);
		renumerarSeApertado(db, 'task_buckets', 'project_view_id = ? AND bucket_id = ?', [bucket.project_view_id, bucket_id]);
		return true;
	})();
}
