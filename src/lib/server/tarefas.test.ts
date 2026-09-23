import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { migrar } from './migrar.ts';
import { criarTarefa, marcarFeita } from './tarefas.ts';

const TZ = 'America/Sao_Paulo';
const AGORA = Date.parse('2026-09-22T15:00:00.000Z');
const dir = new URL('../../../migrations/', import.meta.url);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'P')").run();
	return db;
}
const coluna = (db: Database.Database, id: number) =>
	db.prepare('SELECT b.title FROM task_buckets tb JOIN buckets b ON b.id = tb.bucket_id WHERE tb.task_id = ?').pluck().get(id);
const tarefa = (db: Database.Database, id: number) =>
	db.prepare('SELECT done, done_at, due_date FROM tasks WHERE id = ?').get(id) as { done: number; done_at: string | null; due_date: string | null };

test('criar põe no fim da lista e da coluna padrão', () => {
	const db = banco();
	const a = criarTarefa(db, { project_id: 1, title: 'a' });
	const b = criarTarefa(db, { project_id: 1, title: 'b' });
	assert.equal(coluna(db, a), 'A fazer');
	const pos = db.prepare('SELECT task_id FROM task_positions ORDER BY position').pluck().all();
	assert.deepEqual(pos, [a, b]);
});

test('feita e reaberta movem o card entre A fazer e Feito', () => {
	const db = banco();
	const id = criarTarefa(db, { project_id: 1, title: 'x' });
	assert.ok(marcarFeita(db, id, true, { tz: TZ, agora: AGORA }));
	assert.deepEqual([tarefa(db, id).done, coluna(db, id)], [1, 'Feito']);
	assert.equal(tarefa(db, id).done_at, '2026-09-22T15:00:00.000Z');
	marcarFeita(db, id, false, { tz: TZ, agora: AGORA });
	assert.deepEqual([tarefa(db, id).done, coluna(db, id)], [0, 'A fazer']);
	assert.equal(marcarFeita(db, 999, true, { tz: TZ }), false);
});

test('recorrente feita avança o prazo, fica aberta e reabre as subtarefas', () => {
	const db = banco();
	const id = criarTarefa(db, { project_id: 1, title: 'mensal', due_date: '2026-09-10T15:00:00.000Z' });
	db.prepare("UPDATE tasks SET repeat_every = 1, repeat_unit = 'month' WHERE id = ?").run(id);
	const sub = criarTarefa(db, { project_id: 1, title: 'sub', parent_task_id: id });
	marcarFeita(db, sub, true, { tz: TZ, agora: AGORA });
	marcarFeita(db, id, true, { tz: TZ, agora: AGORA });
	const t = tarefa(db, id);
	assert.deepEqual([t.done, t.due_date, coluna(db, id)], [0, '2026-10-10T15:00:00.000Z', 'A fazer']);
	assert.equal(tarefa(db, sub).done, 0, 'subtarefa reaberta');
});
