import { randomUUID } from 'node:crypto';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type Database from 'better-sqlite3';

/** Entrada inválida vinda do cliente (400). */
export class Invalido extends Error {}

/** Limite do Anexo (#12, spec seção 14): 25 MB, mesmo teto do BODY_SIZE_LIMIT. */
export const LIMITE_BYTES = 25 * 1024 * 1024;

// stored_name é sempre gerado pelo servidor com randomUUID(): a varredura de
// órfãos só mexe em arquivos que batem com esse padrão (ADR 0005).
const PADRAO_STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Anexo = { id: number; task_id: number; file_name: string; stored_name: string; mime: string; size: number; created_at: string };

/** false = a tarefa não existe (404 na rota). */
export function listarAnexos(db: Database.Database, taskId: number): Anexo[] | false {
	if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId)) return false;
	return db.prepare('SELECT id, task_id, file_name, stored_name, mime, size, created_at FROM attachments WHERE task_id = ? ORDER BY created_at').all(taskId) as Anexo[];
}

export const buscarAnexo = (db: Database.Database, id: number): Anexo | null =>
	(db.prepare('SELECT id, task_id, file_name, stored_name, mime, size, created_at FROM attachments WHERE id = ?').get(id) as Anexo) ?? null;

/**
 * Grava o arquivo em `filesPath/<stored_name>` (nome gerado aqui, nunca do
 * cliente, ADR 0005) e a linha em `attachments`. false = tarefa não existe.
 */
export async function salvarAnexo(db: Database.Database, filesPath: string, taskId: number, file: File): Promise<number | false> {
	if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId)) return false;
	if (!(file instanceof File) || !file.name) throw new Invalido('arquivo ausente.');
	if (file.size > LIMITE_BYTES) throw new Invalido('arquivo maior que 25 MB.');
	const storedName = randomUUID();
	await mkdir(filesPath, { recursive: true });
	await writeFile(join(filesPath, storedName), Buffer.from(await file.arrayBuffer()));
	try {
		return db
			.prepare('INSERT INTO attachments (task_id, file_name, stored_name, mime, size) VALUES (?, ?, ?, ?, ?)')
			.run(taskId, file.name, storedName, file.type || 'application/octet-stream', file.size).lastInsertRowid as number;
	} catch (e) {
		await unlink(join(filesPath, storedName)).catch(() => {});
		throw e;
	}
}

/** Apaga a linha e o arquivo. false = o anexo não existe (404 na rota). */
export async function apagarAnexo(db: Database.Database, filesPath: string, id: number): Promise<boolean> {
	const row = buscarAnexo(db, id);
	if (!row) return false;
	db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
	await unlink(join(filesPath, row.stored_name)).catch(() => {});
	return true;
}

/**
 * Boot (#12, ADR 0005): remove de `filesPath` todo arquivo cujo nome bate com
 * o padrão gerado pelo servidor (UUID) e não tem linha em `attachments`.
 * Ignora subpastas e qualquer nome fora do padrão — nunca mexe em algo que o
 * app não gerou. Pasta ainda inexistente: nada a varrer.
 */
export async function varrerOrfaos(db: Database.Database, filesPath: string): Promise<void> {
	let entradas;
	try {
		entradas = await readdir(filesPath, { withFileTypes: true });
	} catch {
		return;
	}
	const validos = new Set(db.prepare('SELECT stored_name FROM attachments').pluck().all() as string[]);
	for (const e of entradas) {
		if (!e.isFile() || !PADRAO_STORED_NAME.test(e.name) || validos.has(e.name)) continue;
		await unlink(join(filesPath, e.name)).catch(() => {});
	}
}
