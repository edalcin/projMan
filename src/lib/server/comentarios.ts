import type Database from 'better-sqlite3';
import { sanitizar } from './html.ts';

/** Entrada inválida vinda do cliente (400). */
export class Invalido extends Error {}

export type Comentario = { id: number; task_id: number; body: string; created_at: string; updated_at: string };

/** false = a tarefa não existe (404 na rota). */
export function listarComentarios(db: Database.Database, taskId: number): Comentario[] | false {
	if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId)) return false;
	return db.prepare('SELECT id, task_id, body, created_at, updated_at FROM comments WHERE task_id = ? ORDER BY created_at').all(taskId) as Comentario[];
}

/** HTML sanitizado por `sanitizar` (#4, ADR 0002); vazio depois de sanitizar → 400. false = tarefa não existe. */
export function criarComentario(db: Database.Database, taskId: number, corpoCru: unknown): number | false {
	if (!db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId)) return false;
	if (typeof corpoCru !== 'string') throw new Invalido('body precisa ser texto.');
	const body = sanitizar(corpoCru);
	if (!body.trim()) throw new Invalido('comentário vazio.');
	return db.prepare('INSERT INTO comments (task_id, body) VALUES (?, ?)').run(taskId, body).lastInsertRowid as number;
}

/** false = o comentário não existe nessa tarefa (404 na rota). */
export function atualizarComentario(db: Database.Database, taskId: number, id: number, corpoCru: unknown): boolean {
	if (typeof corpoCru !== 'string') throw new Invalido('body precisa ser texto.');
	const body = sanitizar(corpoCru);
	if (!body.trim()) throw new Invalido('comentário vazio.');
	return db
		.prepare("UPDATE comments SET body = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ') WHERE id = ? AND task_id = ?")
		.run(body, id, taskId).changes > 0;
}

export const apagarComentario = (db: Database.Database, taskId: number, id: number) =>
	db.prepare('DELETE FROM comments WHERE id = ? AND task_id = ?').run(id, taskId).changes > 0;
