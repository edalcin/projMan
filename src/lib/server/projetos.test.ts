import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { migrar } from './migrar.ts';
import { Invalido, cor, criarProjeto, moverProjeto, salvarLabel, titulo } from './projetos.ts';

const dir = new URL('../../../migrations/', import.meta.url);
function banco() {
	const db = new Database(':memory:');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	return db;
}
const ordem = (db: Database.Database) =>
	db.prepare('SELECT title FROM projects ORDER BY position, id').pluck().all();

test('mover troca vizinhos, desempata posições iguais e para nas pontas', () => {
	const db = banco();
	// posição padrão 0 em todos: o caso que um swap simples não resolve
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'A'), (2, 'B'), (3, 'C')").run();
	assert.ok(moverProjeto(db, 3, -1));
	assert.deepEqual(ordem(db), ['A', 'C', 'B']);
	assert.ok(moverProjeto(db, 1, -1), 'na ponta: existe, não se move');
	assert.deepEqual(ordem(db), ['A', 'C', 'B']);
	assert.equal(moverProjeto(db, 99, 1), false, 'id inexistente');
	criarProjeto(db, 'D');
	assert.deepEqual(ordem(db), ['A', 'C', 'B', 'D'], 'projeto novo entra no fim');
});

test('validação de nome, cor e label repetida', () => {
	assert.equal(titulo('  Casa  '), 'Casa');
	for (const x of ['', '   ', 'x'.repeat(201), null, 3]) assert.throws(() => titulo(x), Invalido);
	assert.equal(cor('#A1B2C3'), 'a1b2c3');
	assert.equal(cor(''), null);
	for (const x of ['#abc', 'red', '#12345g']) assert.throws(() => cor(x), Invalido);
	const db = banco();
	salvarLabel(db, null, 'Urgente', null);
	assert.throws(() => salvarLabel(db, null, 'urgente', null), Invalido, 'mesmo nome sem diferenciar caixa');
});
