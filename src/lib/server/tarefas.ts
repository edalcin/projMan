import type Database from 'better-sqlite3';
import { proximoPrazo, type RepeatUnit } from '../datas.ts';
import { PASSO } from './posicao.ts';

export type NovaTarefa = {
	project_id: number;
	title: string;
	parent_task_id?: number | null;
	due_date?: string | null;
	due_all_day?: boolean;
	priority?: number;
};

/**
 * Cria a tarefa e a põe no fim da List/Table (`task_positions`) e no fim da
 * coluna padrão do Kanban (`task_buckets`) do projeto (#7).
 */
export const criarTarefa = (db: Database.Database, t: NovaTarefa): number =>
	db.transaction(() => {
		const id = Number(
			db
				.prepare(
					`INSERT INTO tasks (project_id, parent_task_id, title, due_date, due_all_day, priority)
					 VALUES (?, ?, ?, ?, ?, ?)`
				)
				.run(t.project_id, t.parent_task_id ?? null, t.title, t.due_date ?? null, t.due_all_day === false ? 0 : 1, t.priority ?? 0)
				.lastInsertRowid
		);
		const lista = db
			.prepare(`SELECT id FROM project_views WHERE project_id = ? AND view_kind = 'list'`)
			.pluck()
			.get(t.project_id) as number;
		const fimLista = db
			.prepare('SELECT coalesce(max(position), 0) FROM task_positions WHERE project_view_id = ?')
			.pluck()
			.get(lista) as number;
		db.prepare('INSERT INTO task_positions VALUES (?, ?, ?)').run(id, lista, fimLista + PASSO);
		const kanban = db
			.prepare(`SELECT id, default_bucket_id FROM project_views WHERE project_id = ? AND view_kind = 'kanban'`)
			.get(t.project_id) as { id: number; default_bucket_id: number };
		colocarNoFim(db, id, kanban.id, kanban.default_bucket_id);
		return id;
	})();

/** Põe (ou move) o card no fim de uma coluna do Kanban. */
function colocarNoFim(db: Database.Database, task: number, view: number, bucket: number) {
	const fim = db
		.prepare('SELECT coalesce(max(position), 0) FROM task_buckets WHERE bucket_id = ?')
		.pluck()
		.get(bucket) as number;
	db.prepare(
		`INSERT INTO task_buckets (task_id, project_view_id, bucket_id, position) VALUES (?, ?, ?, ?)
		 ON CONFLICT (task_id, project_view_id) DO UPDATE SET bucket_id = excluded.bucket_id, position = excluded.position`
	).run(task, view, bucket, fim + PASSO);
}

/**
 * Ponto ÚNICO que escreve `done` (#7, #8). Nenhum outro caminho escreve `done`.
 * - feita=true, sem recorrência: done=1, done_at=agora, card para o bucket de feitas.
 * - feita=true, recorrente com prazo: o prazo avança (a partir do prazo anterior,
 *   pulando ciclos vencidos), done fica 0, done_at=agora, as subtarefas diretas
 *   reabrem, o card volta ao bucket padrão.
 * - feita=false: done=0 (done_at fica, é histórico), card volta ao bucket padrão
 *   se estava no de feitas.
 * Devolve false se a tarefa não existe.
 */
export function marcarFeita(
	db: Database.Database,
	id: number,
	feita: boolean,
	{ tz, agora = Date.now() }: { tz: string; agora?: number }
): boolean {
	return db.transaction(() => {
		const t = db
			.prepare('SELECT project_id, due_date, repeat_every, repeat_unit FROM tasks WHERE id = ?')
			.get(id) as
			| { project_id: number; due_date: string | null; repeat_every: number | null; repeat_unit: RepeatUnit | null }
			| undefined;
		if (!t) return false;
		const kanban = db
			.prepare(
				`SELECT id, default_bucket_id, done_bucket_id FROM project_views WHERE project_id = ? AND view_kind = 'kanban'`
			)
			.get(t.project_id) as { id: number; default_bucket_id: number; done_bucket_id: number };
		const bucketAtual = db
			.prepare('SELECT bucket_id FROM task_buckets WHERE task_id = ? AND project_view_id = ?')
			.pluck()
			.get(id, kanban.id) as number | undefined;
		const iso = new Date(agora).toISOString();

		if (feita && t.repeat_every && t.repeat_unit && t.due_date) {
			db.prepare('UPDATE tasks SET done = 0, done_at = ?, due_date = ?, updated_at = ? WHERE id = ?').run(
				iso,
				proximoPrazo(t.due_date, t.repeat_every, t.repeat_unit, tz, agora),
				iso,
				id
			);
			db.prepare('UPDATE tasks SET done = 0, updated_at = ? WHERE parent_task_id = ? AND done = 1').run(iso, id);
			if (bucketAtual !== kanban.default_bucket_id) colocarNoFim(db, id, kanban.id, kanban.default_bucket_id);
		} else if (feita) {
			db.prepare('UPDATE tasks SET done = 1, done_at = ?, updated_at = ? WHERE id = ?').run(iso, iso, id);
			if (bucketAtual !== kanban.done_bucket_id) colocarNoFim(db, id, kanban.id, kanban.done_bucket_id);
		} else {
			db.prepare('UPDATE tasks SET done = 0, updated_at = ? WHERE id = ?').run(iso, id);
			if (bucketAtual === undefined || bucketAtual === kanban.done_bucket_id)
				colocarNoFim(db, id, kanban.id, kanban.default_bucket_id);
		}
		return true;
	})();
}
