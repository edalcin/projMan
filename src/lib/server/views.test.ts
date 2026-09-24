import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { migrar } from './migrar.ts';
import { criarTarefa, marcarFeita } from './tarefas.ts';
import { listarKanban, listarList, listarTable, moverKanban, moverNaView } from './views.ts';

const TZ = 'America/Sao_Paulo';
const dir = new URL('../../../migrations/', import.meta.url);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'P')").run();
	return db;
}

const viewId = (db: Database.Database, kind: string) =>
	db.prepare('SELECT id FROM project_views WHERE project_id = 1 AND view_kind = ?').pluck().get(kind) as number;
const bucketId = (db: Database.Database, title: string) => db.prepare('SELECT id FROM buckets WHERE title = ?').pluck().get(title) as number;
const posView = (db: Database.Database, task: number, view: number) =>
	db.prepare('SELECT position FROM task_positions WHERE task_id = ? AND project_view_id = ?').pluck().get(task, view) as number;
const posBucket = (db: Database.Database, task: number, view: number) =>
	db.prepare('SELECT position FROM task_buckets WHERE task_id = ? AND project_view_id = ?').pluck().get(task, view) as number;

test('projeto inexistente devolve null (404 na rota)', () => {
	const db = banco();
	assert.equal(listarList(db, 999), null);
	assert.equal(listarTable(db, 999), null);
	assert.equal(listarKanban(db, 999), null);
});

test('listarList: abertas por padrão, feitas com feitas=true, subtarefa com mãe', () => {
	const db = banco();
	const a = criarTarefa(db, { project_id: 1, title: 'a' });
	const b = criarTarefa(db, { project_id: 1, title: 'b' });
	const sub = criarTarefa(db, { project_id: 1, title: 'sub', parent_task_id: a });
	assert.ok(marcarFeita(db, b, true, { tz: TZ }));

	const abertas = listarList(db, 1);
	assert.deepEqual(
		abertas!.map((t) => t.id),
		[a, sub]
	);
	assert.equal(abertas![1].mae, 'a');

	const feitas = listarList(db, 1, { feitas: true });
	assert.deepEqual(
		feitas!.map((t) => t.id),
		[b]
	);
});

test('listarList traz labels da tarefa', () => {
	const db = banco();
	const a = criarTarefa(db, { project_id: 1, title: 'a' });
	db.prepare("INSERT INTO labels (id, title, hex_color) VALUES (1, 'Urgente', 'ff0000')").run();
	db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, 1)').run(a);
	const lista = listarList(db, 1);
	assert.deepEqual(lista![0].labels, [{ id: 1, title: 'Urgente', hex_color: 'ff0000' }]);
});

test('listarTable ordena por título, prazo ou prioridade via ordem', () => {
	const db = banco();
	criarTarefa(db, { project_id: 1, title: 'zebra', priority: 1 });
	criarTarefa(db, { project_id: 1, title: 'abacaxi', priority: 5, due_date: '2027-01-01T00:00:00.000Z' });
	const porTitulo = listarTable(db, 1, { ordem: 'titulo' })!.map((t) => t.title);
	assert.deepEqual(porTitulo, ['abacaxi', 'zebra']);
	const porPrioridade = listarTable(db, 1, { ordem: 'prioridade' })!.map((t) => t.title);
	assert.deepEqual(porPrioridade, ['abacaxi', 'zebra']);
	const porPrazo = listarTable(db, 1, { ordem: 'prazo' })!.map((t) => t.title);
	assert.deepEqual(porPrazo, ['abacaxi', 'zebra']); // zebra sem prazo vai por último
});

test('listarKanban agrupa cards por bucket, na ordem dos buckets e da posição', () => {
	const db = banco();
	const a = criarTarefa(db, { project_id: 1, title: 'a' });
	const b = criarTarefa(db, { project_id: 1, title: 'b' });
	const kanban = listarKanban(db, 1)!;
	assert.deepEqual(
		kanban.map((c) => c.title),
		['A fazer', 'Fazendo', 'Feito']
	);
	assert.deepEqual(
		kanban[0].tarefas.map((t) => t.id),
		[a, b]
	);
	assert.deepEqual(kanban[1].tarefas, []);
});

test('moverNaView calcula a posição entre vizinhos e renumera vão apertado', () => {
	const db = banco();
	const a = criarTarefa(db, { project_id: 1, title: 'a' });
	const b = criarTarefa(db, { project_id: 1, title: 'b' });
	const v = viewId(db, 'list');
	assert.equal(moverNaView(db, { task_id: 999, view_id: v, antes: null, depois: null }), false);

	assert.ok(moverNaView(db, { task_id: b, view_id: v, antes: null, depois: posView(db, a, v) }));
	assert.deepEqual(
		listarList(db, 1)!.map((t) => t.id),
		[b, a]
	);

	// b martela o vão entre a e ela mesma: cada volta insere b entre a e seu
	// próprio lugar anterior, cortando o vão pela metade (mesmo teste do
	// protótipo #16). Com passo 1024 e MIN 0,01, a 17ª volta cruza o limite e
	// força a renumeração — devolvendo exatamente 1024/2048, não um vão
	// minúsculo.
	for (let i = 0; i < 17; i++) moverNaView(db, { task_id: b, view_id: v, antes: posView(db, a, v), depois: posView(db, b, v) });
	const pos = db.prepare('SELECT position FROM task_positions WHERE project_view_id = ? ORDER BY position').pluck().all(v) as number[];
	assert.deepEqual(pos, [1024, 2048]); // renumerado com passo fixo, não um vão < MIN
});

test('moverKanban: entrar no bucket de feitas marca feita; sair reabre; grava a posição do drop', () => {
	const db = banco();
	const a = criarTarefa(db, { project_id: 1, title: 'a' });
	const b = criarTarefa(db, { project_id: 1, title: 'b' });
	const feito = bucketId(db, 'Feito');
	const fazendo = bucketId(db, 'Fazendo');
	const v = viewId(db, 'kanban');

	assert.equal(moverKanban(db, { task_id: 999, bucket_id: feito, antes: null, depois: null }, { tz: TZ }), false);
	assert.equal(moverKanban(db, { task_id: a, bucket_id: 999, antes: null, depois: null }, { tz: TZ }), false);

	assert.ok(moverKanban(db, { task_id: a, bucket_id: feito, antes: null, depois: null }, { tz: TZ }));
	assert.equal(db.prepare('SELECT done FROM tasks WHERE id = ?').pluck().get(a), 1);
	assert.equal(db.prepare('SELECT bucket_id FROM task_buckets WHERE task_id = ?').pluck().get(a), feito);

	assert.ok(moverKanban(db, { task_id: a, bucket_id: fazendo, antes: null, depois: posBucket(db, b, v) }, { tz: TZ }));
	assert.equal(db.prepare('SELECT done FROM tasks WHERE id = ?').pluck().get(a), 0, 'sair do bucket de feitas reabre');
	assert.equal(db.prepare('SELECT bucket_id FROM task_buckets WHERE task_id = ?').pluck().get(a), fazendo);
	assert.ok(posBucket(db, a, v) < posBucket(db, b, v), 'posição do drop respeitada, não o fim da coluna');
});
