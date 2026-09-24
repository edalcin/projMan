import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { FiltroInvalido, apagarFiltro, atualizarFiltro, buscarFiltro, criarFiltro, formParaFiltro, moverFiltro } from './filtros-salvos.ts';
import { Invalido } from './projetos.ts';
import { migrar } from './migrar.ts';

const dir = new URL('../../../migrations/', import.meta.url);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	return db;
}

test('formParaFiltro monta os quatro casos do #15', () => {
	// Abertas, prazo nos próximos 7 dias, sem label
	const f1 = new FormData();
	f1.set('labels_nenhuma', '1');
	f1.set('prazoTipo', 'proximos');
	f1.set('prazoDias', '7');
	assert.deepEqual(formParaFiltro(f1), { v: 1, labels: { nenhuma: true }, prazo: { tipo: 'proximos', dias: 7 } });

	// Prioridade alta ou urgente, qualquer projeto
	const f2 = new FormData();
	f2.set('prioridadeMin', '3');
	assert.deepEqual(formParaFiltro(f2), { v: 1, prioridadeMin: 3 });

	// Label 'herbário' e não feita
	const f3 = new FormData();
	f3.set('label_1', 'in');
	assert.deepEqual(formParaFiltro(f3), { v: 1, labels: { in: [1] } });

	// Sem prazo e criada há mais de 30 dias
	const f4 = new FormData();
	f4.set('prazoTipo', 'sem');
	f4.set('criadaHaMaisDe', '30');
	assert.deepEqual(formParaFiltro(f4), { v: 1, prazo: { tipo: 'sem' }, criadaHaMaisDe: 30 });
});

test('formParaFiltro ignora campo vazio e combina label in/notIn de labels diferentes', () => {
	const f = new FormData();
	f.set('title', 'ignorado aqui'); // não é campo do filtro
	f.set('estado', 'abertas'); // default: vira ausente
	f.set('label_1', 'in');
	f.set('label_2', 'notIn');
	f.set('label_3', ''); // "qualquer": sem restrição
	f.set('texto', '   '); // só espaço: vira ausente
	assert.deepEqual(formParaFiltro(f), { v: 1, labels: { in: [1], notIn: [2] } });
});

test('criarFiltro valida com parseFiltro e titulo antes de gravar', () => {
	const db = banco();
	const id = criarFiltro(db, 'Herbário atrasado', { v: 1, labels: { in: [1] } });
	const salvo = buscarFiltro(db, id);
	assert.deepEqual(salvo, { id, title: 'Herbário atrasado', filtro: { v: 1, labels: { in: [1] } } });

	assert.throws(() => criarFiltro(db, '', { v: 1 }), Invalido);
	assert.throws(() => criarFiltro(db, 'nome ok', { v: 1, prioridadeMin: 9 }), FiltroInvalido);
	assert.throws(() => criarFiltro(db, 'nome ok', { v: 1, campoTypo: true }), FiltroInvalido);
});

test('atualizarFiltro sobrescreve e devolve false para id inexistente', () => {
	const db = banco();
	const id = criarFiltro(db, 'Filtro A', { v: 1 });
	assert.equal(atualizarFiltro(db, id, 'Filtro A renomeado', { v: 1, estado: 'todas' }), true);
	assert.deepEqual(buscarFiltro(db, id)?.filtro, { v: 1, estado: 'todas' });
	assert.equal(atualizarFiltro(db, 999, 'x', { v: 1 }), false);
});

test('buscarFiltro devolve null para id inexistente', () => {
	const db = banco();
	assert.equal(buscarFiltro(db, 999), null);
});

test('apagarFiltro remove a linha e devolve false na segunda vez', () => {
	const db = banco();
	const id = criarFiltro(db, 'Descartável', { v: 1 });
	assert.equal(apagarFiltro(db, id), true);
	assert.equal(apagarFiltro(db, id), false);
	assert.equal(buscarFiltro(db, id), null);
});

test('moverFiltro troca a posição com o vizinho, devolve false só para id inexistente', () => {
	const db = banco();
	const a = criarFiltro(db, 'A', { v: 1 });
	const b = criarFiltro(db, 'B', { v: 1 });
	const c = criarFiltro(db, 'C', { v: 1 });
	const ordem = () => (db.prepare('SELECT id FROM saved_filters ORDER BY position, id').pluck().all() as number[]);
	assert.deepEqual(ordem(), [a, b, c]);

	assert.equal(moverFiltro(db, b, -1), true);
	assert.deepEqual(ordem(), [b, a, c]);

	// já no topo: não move mais, mas o id existe
	assert.equal(moverFiltro(db, b, -1), true);
	assert.deepEqual(ordem(), [b, a, c]);

	assert.equal(moverFiltro(db, 999, 1), false);
});
