import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { Invalido, LIMITE_BYTES, apagarAnexo, buscarAnexo, listarAnexos, salvarAnexo, varrerOrfaos } from './anexos.ts';
import { migrar } from './migrar.ts';

const dir = new URL('../../../migrations/', import.meta.url);

function banco() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'P')").run();
	db.prepare("INSERT INTO tasks (id, project_id, title) VALUES (1, 1, 'T')").run();
	return db;
}

function tempDir() {
	return mkdtempSync(join(tmpdir(), 'projman-anexos-'));
}

test('salvarAnexo grava arquivo e metadados; false para tarefa inexistente', async () => {
	const db = banco();
	const files = tempDir();
	try {
		const file = new File(['conteúdo'], 'nota.txt', { type: 'text/plain' });
		const id = await salvarAnexo(db, files, 1, file);
		assert.notEqual(id, false);
		const row = buscarAnexo(db, id as number);
		assert.equal(row!.file_name, 'nota.txt');
		assert.equal(row!.mime, 'text/plain');
		assert.equal(readFileSync(join(files, row!.stored_name), 'utf8'), 'conteúdo');
		assert.equal(await salvarAnexo(db, files, 999, file), false);
	} finally {
		rmSync(files, { recursive: true, force: true });
	}
});

test('salvarAnexo recusa arquivo maior que 25 MB', async () => {
	const db = banco();
	const files = tempDir();
	try {
		const grande = new File([new Uint8Array(LIMITE_BYTES + 1)], 'grande.bin');
		await assert.rejects(salvarAnexo(db, files, 1, grande), Invalido);
		assert.deepEqual(await readdir(files), []); // nada gravado
	} finally {
		rmSync(files, { recursive: true, force: true });
	}
});

test('listarAnexos e apagarAnexo removem linha e arquivo', async () => {
	const db = banco();
	const files = tempDir();
	try {
		const id = (await salvarAnexo(db, files, 1, new File(['x'], 'a.txt'))) as number;
		assert.equal((listarAnexos(db, 1) as unknown[]).length, 1);
		assert.equal(await apagarAnexo(db, files, id), true);
		assert.deepEqual(listarAnexos(db, 1), []);
		assert.deepEqual(await readdir(files), []);
		assert.equal(await apagarAnexo(db, files, id), false); // já apagado
	} finally {
		rmSync(files, { recursive: true, force: true });
	}
});

test('varrerOrfaos só remove arquivos no padrão UUID sem linha em attachments', async () => {
	const db = banco();
	const files = tempDir();
	try {
		const valido = (await salvarAnexo(db, files, 1, new File(['x'], 'v.txt'))) as number;
		const storedValido = buscarAnexo(db, valido)!.stored_name;
		const orfaoUuid = '11111111-1111-1111-1111-111111111111';
		writeFileSync(join(files, orfaoUuid), 'orfao');
		writeFileSync(join(files, 'nao-e-uuid.txt'), 'ignorado');
		mkdirSync(join(files, 'subpasta'));
		writeFileSync(join(files, 'subpasta', '22222222-2222-2222-2222-222222222222'), 'ignorado tambem');

		await varrerOrfaos(db, files);

		assert.deepEqual(readdirSync(files).sort(), ['nao-e-uuid.txt', 'subpasta', storedValido].sort());
	} finally {
		rmSync(files, { recursive: true, force: true });
	}
});

test('varrerOrfaos não falha se a pasta ainda não existe', async () => {
	const db = banco();
	await assert.doesNotReject(varrerOrfaos(db, join(tmpdir(), 'projman-nao-existe-' + Date.now())));
});
