import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

/** Entrada inválida vinda do formulário. A mensagem vai para a UI. */
export class Invalido extends Error {}

const PASSO = 1024; // mesmo passo das posições de tarefa (#16)

/** Título de projeto/label: 1 a 200 caracteres depois do trim. */
export function titulo(x: unknown): string {
	const t = typeof x === 'string' ? x.trim() : '';
	if (!t || t.length > 200) throw new Invalido('O nome precisa ter de 1 a 200 caracteres.');
	return t;
}

/** Cor do `<input type="color">` (`#rrggbb`) → `rrggbb`, como o CHECK do banco exige. Vazio = sem cor. */
export function cor(x: unknown): string | null {
	if (x === null || x === '') return null;
	const c = typeof x === 'string' ? x.replace(/^#/, '').toLowerCase() : '';
	if (!/^[0-9a-f]{6}$/.test(c)) throw new Invalido('Cor inválida.');
	return c;
}

export function criarProjeto(db: Database.Database, nome: string): number {
	const fim = db.prepare('SELECT coalesce(max(position), 0) FROM projects').pluck().get() as number;
	return Number(db.prepare('INSERT INTO projects (title, position) VALUES (?, ?)').run(nome, fim + PASSO).lastInsertRowid);
}

/** false = o projeto não existe (404 na UI). As chaves de `campos` vêm do código, nunca do cliente. */
export function atualizarProjeto(db: Database.Database, id: number, campos: { title?: string; archived?: 0 | 1 }) {
	const sets = Object.keys(campos).map((k) => `${k} = @${k}`);
	const r = db
		.prepare(`UPDATE projects SET ${sets.join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ') WHERE id = @id`)
		.run({ ...campos, id });
	return r.changes > 0;
}

/**
 * Sobe (-1) ou desce (+1) um projeto uma casa na ordem da sidebar. Renumera a
 * lista inteira com passo fixo: poucos projetos, e posições iguais (o padrão
 * 0 do schema) deixam de empatar.
 */
export const moverProjeto = (db: Database.Database, id: number, delta: -1 | 1) =>
	db.transaction(() => {
		const ids = db.prepare('SELECT id FROM projects ORDER BY position, id').pluck().all() as number[];
		const i = ids.indexOf(id);
		const j = i + delta;
		if (i < 0 || j < 0 || j >= ids.length) return i >= 0;
		[ids[i], ids[j]] = [ids[j], ids[i]];
		const set = db.prepare('UPDATE projects SET position = ? WHERE id = ?');
		ids.forEach((pid, k) => set.run((k + 1) * PASSO, pid));
		return true;
	})();

/** Apagar é físico (#9): tarefas, views, colunas, comentários e anexos vão junto (CASCADE). */
export const apagarProjeto = (db: Database.Database, id: number) =>
	db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0;

export function salvarLabel(db: Database.Database, id: number | null, nome: string, hex: string | null) {
	try {
		if (id === null) db.prepare('INSERT INTO labels (title, hex_color) VALUES (?, ?)').run(nome, hex);
		else return db.prepare('UPDATE labels SET title = ?, hex_color = ? WHERE id = ?').run(nome, hex, id).changes > 0;
		return true;
	} catch (e) {
		// UNIQUE COLLATE NOCASE: "Urgente" e "urgente" são a mesma label
		if (e instanceof Database.SqliteError && e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new Invalido(`Já existe a label "${nome}".`);
		throw e;
	}
}

export const apagarLabel = (db: Database.Database, id: number) =>
	db.prepare('DELETE FROM labels WHERE id = ?').run(id).changes > 0;

/**
 * Link Público (#10): um por Projeto. Criar apaga um anterior, se existir —
 * nunca dois hashes vivos ao mesmo tempo para o mesmo projeto.
 */
export function criarLinkPublico(db: Database.Database, projectId: number): string | false {
	if (!db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)) return false;
	const hash = randomBytes(30).toString('base64url'); // 30 bytes = 40 chars base64url, sem padding
	db.transaction(() => {
		db.prepare('DELETE FROM link_shares WHERE project_id = ?').run(projectId);
		db.prepare('INSERT INTO link_shares (project_id, hash) VALUES (?, ?)').run(projectId, hash);
	})();
	return hash;
}

/** Revogar é apagar a linha: sem prazo de validade, sem reativar o mesmo endereço. */
export const revogarLinkPublico = (db: Database.Database, projectId: number) =>
	db.prepare('DELETE FROM link_shares WHERE project_id = ?').run(projectId).changes > 0;

export const linkPublicoDe = (db: Database.Database, projectId: number) =>
	db.prepare('SELECT hash FROM link_shares WHERE project_id = ?').pluck().get(projectId) as string | undefined;

