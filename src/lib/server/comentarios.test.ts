import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import Database from 'better-sqlite3';
import { Invalido, apagarComentario, atualizarComentario, criarComentario, listarComentarios } from './comentarios.ts';
import { migrar } from './migrar.ts';

const dir = new URL('../../../migrations/', import.meta.url);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'P')").run();
	db.prepare("INSERT INTO tasks (id, project_id, title) VALUES (1, 1, 'T'), (2, 1, 'T2')").run();
	return db;
}

test('criarComentario sanitiza o corpo e grava; false para tarefa inexistente', () => {
	const db = banco();
	const id = criarComentario(db, 1, '<p>oi</p><script>alert(1)</script>');
	assert.notEqual(id, false);
	const [c] = listarComentarios(db, 1) as { body: string }[];
	assert.equal(c.body, '<p>oi</p>');
	assert.equal(criarComentario(db, 999, '<p>x</p>'), false);
});

test('criarComentario: corpo vazio depois de sanitizar é 400 (Invalido)', () => {
	const db = banco();
	assert.throws(() => criarComentario(db, 1, '<script>alert(1)</script>'), Invalido);
	assert.throws(() => criarComentario(db, 1, '   '), Invalido);
	assert.throws(() => criarComentario(db, 1, 123), Invalido);
});

test('listarComentarios: ordem de criação; false para tarefa inexistente', () => {
	const db = banco();
	criarComentario(db, 1, '<p>um</p>');
	criarComentario(db, 1, '<p>dois</p>');
	const lista = listarComentarios(db, 1) as { body: string }[];
	assert.deepEqual(lista.map((c) => c.body), ['<p>um</p>', '<p>dois</p>']);
	assert.equal(listarComentarios(db, 999), false);
});

test('atualizarComentario e apagarComentario são escopados pela tarefa da URL', () => {
	const db = banco();
	const id = criarComentario(db, 1, '<p>original</p>') as number;
	assert.equal(atualizarComentario(db, 2, id, '<p>errado</p>'), false, 'tarefa errada não edita');
	assert.equal(atualizarComentario(db, 1, id, '<p>editado</p>'), true);
	const [c] = listarComentarios(db, 1) as { body: string }[];
	assert.equal(c.body, '<p>editado</p>');
	assert.equal(apagarComentario(db, 2, id), false, 'tarefa errada não apaga');
	assert.equal(apagarComentario(db, 1, id), true);
	assert.deepEqual(listarComentarios(db, 1), []);
});
