import Database from 'better-sqlite3';
import { deLocal, proximoPrazo, type RepeatUnit } from '../datas.ts';
import { PASSO } from './posicao.ts';

/** Entrada inválida vinda do cliente (400). */
export class Invalido extends Error {}

function validarTitulo(x: unknown): string {
	const t = typeof x === 'string' ? x.trim() : '';
	if (!t || t.length > 200) throw new Invalido('O título precisa ter de 1 a 200 caracteres.');
	return t;
}

/**
 * Prazo vindo do cliente (#8): com hora, `toISOString()` pronto; dia inteiro,
 * `YYYY-MM-DD` + due_all_day:true — o servidor converte para o fim daquele
 * dia civil no fuso `tz`. `due_date` ausente/vazio limpa o prazo.
 */
export function normalizarPrazo(
	due_date: unknown,
	due_all_day: unknown,
	tz: string
): { due_date: string | null; due_all_day: 0 | 1 } {
	if (due_date === null || due_date === undefined || due_date === '')
		return { due_date: null, due_all_day: due_all_day === false ? 0 : 1 };
	if (typeof due_date !== 'string') throw new Invalido('due_date inválido.');
	if (due_all_day === false) {
		const ms = Date.parse(due_date);
		if (Number.isNaN(ms)) throw new Invalido('due_date inválido.');
		return { due_date: new Date(ms).toISOString(), due_all_day: 0 };
	}
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due_date);
	if (!m) throw new Invalido('due_date de dia inteiro precisa ser YYYY-MM-DD.');
	const ano = +m[1],
		mes = +m[2],
		dia = +m[3];
	return { due_date: new Date(deLocal({ ano, mes, dia, h: 23, min: 59, s: 59 }, tz, 999)).toISOString(), due_all_day: 1 };
}

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

export type TarefaDetalhe = {
	id: number;
	project_id: number;
	projeto: string;
	parent_task_id: number | null;
	mae: string | null;
	title: string;
	description: string;
	done: number;
	due_date: string | null;
	due_all_day: number;
	priority: number;
	repeat_every: number | null;
	repeat_unit: RepeatUnit | null;
	created_at: string;
	labels: number[];
	subtarefas: { id: number; title: string; done: number }[];
};

/** Detalhe completo do painel (#14). null = tarefa não existe (404 na rota). */
export function lerTarefa(db: Database.Database, id: number): TarefaDetalhe | null {
	const t = db
		.prepare(
			`SELECT t.id, t.project_id, p.title AS projeto, t.parent_task_id, m.title AS mae,
			        t.title, t.description, t.done, t.due_date, t.due_all_day, t.priority,
			        t.repeat_every, t.repeat_unit, t.created_at
			 FROM tasks t
			 JOIN projects p ON p.id = t.project_id
			 LEFT JOIN tasks m ON m.id = t.parent_task_id
			 WHERE t.id = ?`
		)
		.get(id) as Omit<TarefaDetalhe, 'labels' | 'subtarefas'> | undefined;
	if (!t) return null;
	return {
		...t,
		labels: db.prepare('SELECT label_id FROM task_labels WHERE task_id = ? ORDER BY label_id').pluck().all(id) as number[],
		subtarefas: db.prepare('SELECT id, title, done FROM tasks WHERE parent_task_id = ? ORDER BY id').all(id) as {
			id: number;
			title: string;
			done: number;
		}[]
	};
}

export type CamposTarefa = {
	title?: string;
	due_date?: string | null;
	due_all_day?: boolean;
	priority?: number;
	repeat_every?: number | null;
	repeat_unit?: RepeatUnit | null;
	labels?: number[];
	project_id?: number;
};

/**
 * Atualização parcial do painel (#7, #8). false = tarefa não existe (404 na
 * rota). Trocar de projeto refaz as linhas de posição (List/Kanban) no
 * projeto novo, igual ao fim de `criarTarefa`; o trigger de subtarefa do
 * schema aborta (e aqui vira `Invalido`, 400) se a troca deixaria a
 * hierarquia mãe/subtarefa inválida.
 */
export function atualizarTarefa(db: Database.Database, id: number, campos: CamposTarefa, { tz }: { tz: string }): boolean {
	return db.transaction(() => {
		const atual = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(id) as { project_id: number } | undefined;
		if (!atual) return false;

		const sets: string[] = [];
		const params: Record<string, unknown> = { id };

		if (campos.title !== undefined) {
			sets.push('title = @title');
			params.title = validarTitulo(campos.title);
		}
		if ('due_date' in campos) {
			const n = normalizarPrazo(campos.due_date, campos.due_all_day, tz);
			sets.push('due_date = @due_date', 'due_all_day = @due_all_day');
			params.due_date = n.due_date;
			params.due_all_day = n.due_all_day;
		}
		if (campos.priority !== undefined) {
			if (!Number.isInteger(campos.priority) || campos.priority < 0 || campos.priority > 5)
				throw new Invalido('priority precisa ser um inteiro de 0 a 5.');
			sets.push('priority = @priority');
			params.priority = campos.priority;
		}
		if ('repeat_every' in campos || 'repeat_unit' in campos) {
			const every = campos.repeat_every ?? null;
			const unit = campos.repeat_unit ?? null;
			if ((every === null) !== (unit === null)) throw new Invalido('repeat_every e repeat_unit vêm juntos ou nenhum dos dois.');
			if (every !== null && (!Number.isInteger(every) || every <= 0)) throw new Invalido('repeat_every precisa ser um inteiro positivo.');
			if (unit !== null && !['day', 'week', 'month', 'year'].includes(unit)) throw new Invalido('repeat_unit inválido.');
			sets.push('repeat_every = @repeat_every', 'repeat_unit = @repeat_unit');
			params.repeat_every = every;
			params.repeat_unit = unit;
		}
		if (sets.length)
			db.prepare(`UPDATE tasks SET ${sets.join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ') WHERE id = @id`).run(params);

		if (campos.labels !== undefined) {
			if (!Array.isArray(campos.labels) || !campos.labels.every((l) => Number.isInteger(l) && l > 0))
				throw new Invalido('labels precisa ser uma lista de ids.');
			db.prepare('DELETE FROM task_labels WHERE task_id = ?').run(id);
			const ins = db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)');
			for (const l of campos.labels) ins.run(id, l);
		}

		if (campos.project_id !== undefined && campos.project_id !== atual.project_id) {
			try {
				db.prepare('UPDATE tasks SET project_id = ? WHERE id = ?').run(campos.project_id, id);
			} catch (e) {
				if (e instanceof Database.SqliteError) throw new Invalido(e.message);
				throw e;
			}
			db.prepare('DELETE FROM task_positions WHERE task_id = ?').run(id);
			db.prepare('DELETE FROM task_buckets WHERE task_id = ?').run(id);
			const lista = db
				.prepare(`SELECT id FROM project_views WHERE project_id = ? AND view_kind = 'list'`)
				.pluck()
				.get(campos.project_id) as number;
			const fimLista = db
				.prepare('SELECT coalesce(max(position), 0) FROM task_positions WHERE project_view_id = ?')
				.pluck()
				.get(lista) as number;
			db.prepare('INSERT INTO task_positions VALUES (?, ?, ?)').run(id, lista, fimLista + PASSO);
			const kanban = db
				.prepare(`SELECT id, default_bucket_id FROM project_views WHERE project_id = ? AND view_kind = 'kanban'`)
				.get(campos.project_id) as { id: number; default_bucket_id: number };
			colocarNoFim(db, id, kanban.id, kanban.default_bucket_id);
		}

		return true;
	})();
}

/** Apagar é físico (#9): subtarefas, posições, labels, comentários e anexos vão junto (CASCADE). */
export const apagarTarefa = (db: Database.Database, id: number): boolean =>
	db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
