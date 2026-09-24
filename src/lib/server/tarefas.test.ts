import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { migrar } from './migrar.ts';
import { Invalido, apagarTarefa, atualizarTarefa, criarTarefa, lerTarefa, marcarFeita, normalizarPrazo } from './tarefas.ts';

const TZ = 'America/Sao_Paulo';
const AGORA = Date.parse('2026-09-22T15:00:00.000Z');
const dir = new URL('../../../migrations/', import.meta.url);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'P'), (2, 'Q')").run();
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

test('lerTarefa devolve labels e subtarefas', () => {
	const db = banco();
	db.prepare("INSERT INTO labels (id, title) VALUES (1, 'urgente')").run();
	const id = criarTarefa(db, { project_id: 1, title: 'mãe' });
	db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, 1)').run(id);
	const sub = criarTarefa(db, { project_id: 1, title: 'filha', parent_task_id: id });
	const t = lerTarefa(db, id)!;
	assert.equal(t.projeto, 'P');
	assert.deepEqual(t.labels, [1]);
	assert.deepEqual(t.subtarefas, [{ id: sub, title: 'filha', done: 0 }]);
	assert.equal(lerTarefa(db, 999), null);
});

test('normalizarPrazo: dia inteiro converte YYYY-MM-DD para o fim do dia civil no fuso', () => {
	const n = normalizarPrazo('2026-09-22', true, TZ);
	assert.deepEqual(n, { due_date: new Date('2026-09-23T02:59:59.999Z').toISOString(), due_all_day: 1 });
	assert.throws(() => normalizarPrazo('não é data', true, TZ), Invalido);
	assert.deepEqual(normalizarPrazo(null, true, TZ), { due_date: null, due_all_day: 1 });
	assert.deepEqual(normalizarPrazo('2026-09-22T10:00:00.000Z', false, TZ), { due_date: '2026-09-22T10:00:00.000Z', due_all_day: 0 });
});

test('atualizarTarefa: título, prazo e prioridade', () => {
	const db = banco();
	const id = criarTarefa(db, { project_id: 1, title: 'x' });
	assert.ok(atualizarTarefa(db, id, { title: '  novo  ', priority: 3 }, { tz: TZ }));
	let t = lerTarefa(db, id)!;
	assert.deepEqual([t.title, t.priority], ['novo', 3]);
	assert.ok(atualizarTarefa(db, id, { due_date: '2026-10-01', due_all_day: true }, { tz: TZ }));
	t = lerTarefa(db, id)!;
	assert.deepEqual([t.due_date, t.due_all_day], [new Date('2026-10-02T02:59:59.999Z').toISOString(), 1]);
	assert.throws(() => atualizarTarefa(db, id, { title: '' }, { tz: TZ }), Invalido);
	assert.throws(() => atualizarTarefa(db, id, { priority: 9 }, { tz: TZ }), Invalido);
	assert.throws(() => atualizarTarefa(db, id, { repeat_every: 2 }, { tz: TZ }), Invalido);
	assert.equal(atualizarTarefa(db, 999, { priority: 1 }, { tz: TZ }), false);
});

test('atualizarTarefa: description sanitiza, gera description_text e respeita o limite', () => {
	const db = banco();
	const id = criarTarefa(db, { project_id: 1, title: 'x' });
	assert.ok(
		atualizarTarefa(db, id, { description: '<p><strong>Oi</strong></p><script>alert(1)</script><ul><li>a</li></ul>' }, { tz: TZ })
	);
	const t = lerTarefa(db, id)!;
	assert.equal(t.description, '<p><strong>Oi</strong></p><ul><li>a</li></ul>');
	assert.equal(db.prepare('SELECT description_text FROM tasks WHERE id = ?').pluck().get(id), 'Oi a');
	assert.equal(db.prepare("SELECT rowid FROM tasks_fts WHERE tasks_fts MATCH 'Oi'").pluck().get(), id);
	assert.throws(() => atualizarTarefa(db, id, { description: 'x'.repeat(100_001) }, { tz: TZ }), Invalido);
});

test('atualizarTarefa: troca de labels substitui o conjunto inteiro', () => {
	const db = banco();
	db.prepare("INSERT INTO labels (id, title) VALUES (1, 'a'), (2, 'b')").run();
	const id = criarTarefa(db, { project_id: 1, title: 'x' });
	atualizarTarefa(db, id, { labels: [1, 2] }, { tz: TZ });
	assert.deepEqual(lerTarefa(db, id)!.labels, [1, 2]);
	atualizarTarefa(db, id, { labels: [2] }, { tz: TZ });
	assert.deepEqual(lerTarefa(db, id)!.labels, [2]);
	assert.throws(() => atualizarTarefa(db, id, { labels: ['x' as unknown as number] }, { tz: TZ }), Invalido);
});

test('atualizarTarefa: trocar de projeto refaz as posições; subtarefa não pode trocar sozinha', () => {
	const db = banco();
	const id = criarTarefa(db, { project_id: 1, title: 'x' });
	assert.ok(atualizarTarefa(db, id, { project_id: 2 }, { tz: TZ }));
	const t = lerTarefa(db, id)!;
	assert.equal(t.project_id, 2);
	assert.equal(coluna(db, id), 'A fazer');
	const pos = db.prepare('SELECT project_view_id FROM task_positions WHERE task_id = ?').pluck().get(id);
	const listaProjeto2 = db.prepare(`SELECT id FROM project_views WHERE project_id = 2 AND view_kind = 'list'`).pluck().get();
	assert.equal(pos, listaProjeto2);

	const mae = criarTarefa(db, { project_id: 1, title: 'mãe' });
	const sub = criarTarefa(db, { project_id: 1, title: 'filha', parent_task_id: mae });
	assert.throws(() => atualizarTarefa(db, sub, { project_id: 2 }, { tz: TZ }), Invalido);
});

test('apagarTarefa é físico e leva as subtarefas junto', () => {
	const db = banco();
	const mae = criarTarefa(db, { project_id: 1, title: 'mãe' });
	const sub = criarTarefa(db, { project_id: 1, title: 'filha', parent_task_id: mae });
	assert.ok(apagarTarefa(db, mae));
	assert.equal(lerTarefa(db, mae), null);
	assert.equal(lerTarefa(db, sub), null);
	assert.equal(apagarTarefa(db, 999), false);
});
