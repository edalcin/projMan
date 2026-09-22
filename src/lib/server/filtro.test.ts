import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { FiltroInvalido, SMART, listarTarefas, parseFiltro, type Filtro } from './filtro.ts';
import { migrar } from './migrar.ts';

const TZ = 'America/Sao_Paulo';
// 2026-09-22 12:00 em São Paulo
const AGORA = Date.parse('2026-09-22T15:00:00.000Z');
const dir = new URL('../../../migrations/', import.meta.url);

/** Um banco com uma tarefa por situação de prazo, e os casos de borda de projeto e label. */
function cenario() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'Ativo'), (2, 'Arquivado')").run();
	db.prepare('UPDATE projects SET archived = 1 WHERE id = 2').run();
	db.prepare("INSERT INTO labels (id, title) VALUES (1, 'urgente'), (2, 'campo')").run();
	const t = db.prepare(
		'INSERT INTO tasks (id, project_id, title, due_date, done, done_at, priority, description_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
	);
	t.run(1, 1, 'atrasada', '2026-09-21T12:00:00.000Z', 0, null, 0, '');
	t.run(2, 1, 'hoje cedo', '2026-09-22T03:30:00.000Z', 0, null, 3, 'revisar herbário'); // 00:30 local
	t.run(3, 1, 'hoje fim', '2026-09-23T02:59:59.999Z', 0, null, 0, ''); // 23:59:59 local
	t.run(4, 1, 'em 7 dias', '2026-09-30T02:00:00.000Z', 0, null, 5, ''); // 29/09 23:00 local
	t.run(5, 1, 'em 8 dias', '2026-09-30T12:00:00.000Z', 0, null, 0, '');
	t.run(6, 1, 'sem prazo', null, 0, null, 0, '');
	t.run(7, 1, 'feita', '2026-09-22T12:00:00.000Z', 1, '2026-09-22T13:00:00.000Z', 0, '');
	t.run(8, 2, 'de projeto arquivado', '2026-09-22T12:00:00.000Z', 0, null, 0, '');
	db.prepare('INSERT INTO task_labels VALUES (2, 1), (4, 1), (4, 2)').run();
	return db;
}

const ids = (db: Database.Database, f: Filtro) =>
	listarTarefas(db, f, { tz: TZ, agora: AGORA }).tarefas.map((t) => t.id);

test('cada smart list pega exatamente as suas tarefas', () => {
	const db = cenario();
	assert.deepEqual(ids(db, SMART.atrasadas), [1]);
	assert.deepEqual(ids(db, SMART.hoje), [2, 3], 'a janela é o dia local, não o dia UTC');
	assert.deepEqual(ids(db, SMART['7-dias']), [2, 3, 4]);
	assert.deepEqual(ids(db, SMART['sem-prazo']), [6]);
	assert.deepEqual(ids(db, SMART.abertas), [1, 2, 3, 4, 5, 6], 'sem prazo por último; sem feita; sem arquivado');
});

test('estado, labels, prioridade e texto combinam por AND', () => {
	const db = cenario();
	assert.deepEqual(ids(db, { v: 1, estado: 'feitas' }), [7]);
	assert.deepEqual(ids(db, { v: 1, labels: { in: [1] } }), [2, 4]);
	assert.deepEqual(ids(db, { v: 1, labels: { in: [1], notIn: [2] } }), [2]);
	assert.deepEqual(ids(db, { v: 1, prioridadeMin: 3 }), [2, 4]);
	assert.deepEqual(ids(db, { v: 1, texto: 'herbario' }), [2], 'sem acento acha com acento');
	assert.deepEqual(ids(db, { v: 1, texto: 'herb', prazo: { tipo: 'atrasadas' } }), []);
});

test('texto com sintaxe do FTS5 vira texto, não consulta', () => {
	const db = cenario();
	for (const texto of ['"', 'a OR b', 'title:x', 'NEAR(a b)', '*', "'; DROP TABLE tasks; --"])
		assert.doesNotThrow(() => ids(db, { v: 1, texto }), texto);
	assert.equal(db.prepare('SELECT count(*) FROM tasks').pluck().get(), 8);
});

test('o cursor percorre tudo sem repetir nem pular', () => {
	const db = cenario();
	const t = db.prepare('INSERT INTO tasks (project_id, title, due_date) VALUES (1, ?, ?)');
	for (let i = 0; i < 120; i++) t.run(`extra ${i}`, i % 3 ? `2026-10-${String((i % 28) + 1).padStart(2, '0')}T12:00:00.000Z` : null);
	const vistos: number[] = [];
	let cursor: string | undefined;
	do {
		const r = listarTarefas(db, SMART.abertas, { tz: TZ, agora: AGORA, cursor });
		vistos.push(...r.tarefas.map((x) => x.id));
		cursor = r.cursor ?? undefined;
	} while (cursor);
	assert.equal(vistos.length, 126);
	assert.equal(new Set(vistos).size, 126);
});

test('parseFiltro recusa forma errada em vez de alargar o filtro', () => {
	const invalidos: unknown[] = [
		null,
		[],
		{},
		{ v: 2 },
		{ v: 1, projeto: [1] }, // typo de "projetos"
		{ v: 1, projetos: [] },
		{ v: 1, projetos: ['1'] },
		{ v: 1, projetos: [1.5] },
		{ v: 1, labels: { in: [1], or: [2] } },
		{ v: 1, prioridadeMin: 9 },
		{ v: 1, prazo: { tipo: 'proximos' } },
		{ v: 1, prazo: { tipo: 'hoje', dias: 3 } },
		{ v: 1, prazo: { tipo: 'ontem' } },
		{ v: 1, estado: 'todas as coisas' },
		{ v: 1, texto: 'x'.repeat(201) }
	];
	for (const f of invalidos) assert.throws(() => parseFiltro(f), FiltroInvalido, JSON.stringify(f));
	assert.deepEqual(parseFiltro({ v: 1, texto: '   ' }), { v: 1 }, 'texto vazio some');
	for (const f of Object.values(SMART)) assert.deepEqual(parseFiltro(f), f, 'smart lists passam no próprio validador');
});

test('cursor forjado é recusado', () => {
	const db = cenario();
	assert.throws(() => listarTarefas(db, SMART.abertas, { tz: TZ, cursor: 'lixo' }), FiltroInvalido);
});
