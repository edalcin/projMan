import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { migrar } from './migrar.ts';

const dir = new URL('../../../migrations/', import.meta.url);
const migracoes = Object.fromEntries(
	readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])
);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, migracoes);
	return db;
}

function novoProjeto(db: Database.Database) {
	return Number(db.prepare("INSERT INTO projects (title) VALUES ('P')").run().lastInsertRowid);
}

function novaTarefa(db: Database.Database, projeto: number, mae: number | null = null) {
	return Number(
		db
			.prepare('INSERT INTO tasks (project_id, parent_task_id, title) VALUES (?, ?, ?)')
			.run(projeto, mae, 'T').lastInsertRowid
	);
}

test('migrar é idempotente e leva o banco à última versão', () => {
	const db = banco();
	migrar(db, migracoes);
	assert.equal(db.pragma('user_version', { simple: true }), Object.keys(migracoes).length);
});

test('migrar grava snapshot da versão anterior antes de migrar banco em uso', () => {
	const pasta = mkdtempSync(join(tmpdir(), 'projman-migrar-'));
	try {
		const caminho = join(pasta, 'p.db');
		const db = new Database(caminho);
		migrar(db, migracoes);
		const v = db.pragma('user_version', { simple: true }) as number;
		assert.ok(!existsSync(`${caminho}.v0.bak`), 'banco novo não gera snapshot');
		migrar(db, { ...migracoes, [`${v + 1}_x.sql`]: 'CREATE TABLE x (a)' });
		db.close();
		const bak = new Database(`${caminho}.v${v}.bak`, { readonly: true });
		assert.equal(bak.pragma('user_version', { simple: true }), v);
		bak.close();
	} finally {
		rmSync(pasta, { recursive: true, force: true });
	}
});

test('projeto novo nasce com três views e as colunas do Kanban ligadas', () => {
	const db = banco();
	const p = novoProjeto(db);
	const views = db
		.prepare('SELECT view_kind FROM project_views WHERE project_id = ? ORDER BY position')
		.pluck()
		.all(p);
	assert.deepEqual(views, ['list', 'kanban', 'table']);
	const k = db
		.prepare(
			`SELECT d.title AS padrao, f.title AS feito FROM project_views v
			 JOIN buckets d ON d.id = v.default_bucket_id
			 JOIN buckets f ON f.id = v.done_bucket_id
			 WHERE v.project_id = ? AND v.view_kind = 'kanban'`
		)
		.get(p);
	assert.deepEqual({ ...(k as object) }, { padrao: 'A fazer', feito: 'Feito' });
});

test('apagar o projeto apaga tudo o que pende dele', () => {
	const db = banco();
	const p = novoProjeto(db);
	const t = novaTarefa(db, p);
	db.prepare("INSERT INTO comments (task_id, body) VALUES (?, 'c')").run(t);
	db.prepare('DELETE FROM projects WHERE id = ?').run(p);
	for (const tabela of ['tasks', 'comments', 'project_views', 'buckets']) {
		assert.equal(db.prepare(`SELECT count(*) FROM ${tabela}`).pluck().get(), 0, tabela);
	}
});

test('subtarefa tem um nível só: neta é rejeitada', () => {
	const db = banco();
	const p = novoProjeto(db);
	const mae = novaTarefa(db, p);
	const filha = novaTarefa(db, p, mae);
	assert.throws(() => novaTarefa(db, p, filha), /mae invalida/);
});

test('tarefa com filhas não pode virar subtarefa (fecha o caminho do ciclo)', () => {
	const db = banco();
	const p = novoProjeto(db);
	const a = novaTarefa(db, p);
	novaTarefa(db, p, a);
	const b = novaTarefa(db, p);
	assert.throws(
		() => db.prepare('UPDATE tasks SET parent_task_id = ? WHERE id = ?').run(b, a),
		/com filhas/
	);
});

test('subtarefa não pode ter mãe noutro projeto', () => {
	const db = banco();
	const mae = novaTarefa(db, novoProjeto(db));
	assert.throws(() => novaTarefa(db, novoProjeto(db), mae), /mae invalida/);
});

test('recorrência exige every e unit juntos', () => {
	const db = banco();
	const p = novoProjeto(db);
	assert.throws(
		() => db.prepare("INSERT INTO tasks (project_id, title, repeat_every) VALUES (?, 'T', 2)").run(p),
		/CHECK/
	);
});

test('a busca acha pelo texto e acompanha edição e remoção', () => {
	const db = banco();
	const p = novoProjeto(db);
	const t = novaTarefa(db, p);
	const busca = (q: string) => db.prepare('SELECT rowid FROM tasks_fts WHERE tasks_fts MATCH ?').all(q).length;
	db.prepare("UPDATE tasks SET description_text = 'revisar herbário' WHERE id = ?").run(t);
	assert.equal(busca('herbario'), 1, 'sem acento acha com acento');
	db.prepare("UPDATE tasks SET description_text = 'outra coisa' WHERE id = ?").run(t);
	assert.equal(busca('herbario'), 0);
	db.prepare('DELETE FROM tasks WHERE id = ?').run(t);
	assert.equal(busca('outra'), 0);
});

test('link público exige hash de 40 caracteres', () => {
	const db = banco();
	const p = novoProjeto(db);
	assert.throws(
		() => db.prepare("INSERT INTO link_shares (project_id, hash) VALUES (?, 'curto')").run(p),
		/CHECK/
	);
});

test('instante fora do formato canônico é recusado', () => {
	const db = banco();
	const p = novoProjeto(db);
	const inserir = (due: string) =>
		db.prepare("INSERT INTO tasks (project_id, title, due_date) VALUES (?, 'T', ?)").run(p, due);
	assert.doesNotThrow(() => inserir(new Date().toISOString()));
	for (const ruim of ['2026-09-22T12:00:00Z', '2026-09-22', '2026-09-22 12:00:00.000', '2026-09-22T12:00:00.000-03:00'])
		assert.throws(() => inserir(ruim), /CHECK/, ruim);
});
