import type Database from 'better-sqlite3';
import { FiltroInvalido, parseFiltro, type Filtro } from './filtro.ts';
import { Invalido, titulo } from './projetos.ts';

export { FiltroInvalido, Invalido };

const PASSO = 1024; // mesmo passo de projects.position (#9)

/**
 * FormData do `ConstrutorFiltro` → entrada crua para `parseFiltro`. Pura: não
 * toca o banco, não valida faixas (isso é `parseFiltro`). Campo vazio no
 * form vira campo ausente no filtro (sem restrição).
 */
export function formParaFiltro(form: FormData): unknown {
	const f: Record<string, unknown> = { v: 1 };

	const estado = form.get('estado');
	if (estado && estado !== 'abertas') f.estado = estado;

	const projetos = form
		.getAll('projetos')
		.map(Number)
		.filter((n) => Number.isSafeInteger(n) && n > 0);
	if (projetos.length) f.projetos = projetos;

	if (form.get('labels_nenhuma') === '1') {
		f.labels = { nenhuma: true };
	} else {
		const dentro: number[] = [];
		const fora: number[] = [];
		for (const [chave, valor] of form.entries()) {
			const m = /^label_(\d+)$/.exec(chave);
			if (!m) continue;
			if (valor === 'in') dentro.push(Number(m[1]));
			else if (valor === 'notIn') fora.push(Number(m[1]));
		}
		const labels: Record<string, unknown> = {};
		if (dentro.length) labels.in = dentro;
		if (fora.length) labels.notIn = fora;
		if (Object.keys(labels).length) f.labels = labels;
	}

	const prioridadeMin = form.get('prioridadeMin');
	if (prioridadeMin) f.prioridadeMin = Number(prioridadeMin);

	const prazoTipo = form.get('prazoTipo');
	if (prazoTipo === 'proximos') f.prazo = { tipo: 'proximos', dias: Number(form.get('prazoDias')) };
	else if (prazoTipo === 'atrasadas' || prazoTipo === 'hoje' || prazoTipo === 'sem') f.prazo = { tipo: prazoTipo };

	const criadaHaMaisDe = form.get('criadaHaMaisDe');
	if (criadaHaMaisDe) f.criadaHaMaisDe = Number(criadaHaMaisDe);

	const texto = form.get('texto');
	if (typeof texto === 'string' && texto.trim()) f.texto = texto;

	return f;
}

/** Cria o filtro salvo. Título por `titulo()`, filtro sempre por `parseFiltro` antes de gravar. */
export function criarFiltro(db: Database.Database, nome: unknown, entradaFiltro: unknown): number {
	const t = titulo(nome);
	const filtro = parseFiltro(entradaFiltro);
	const fim = db.prepare('SELECT coalesce(max(position), 0) FROM saved_filters').pluck().get() as number;
	return Number(
		db
			.prepare('INSERT INTO saved_filters (title, filter, position) VALUES (?, ?, ?)')
			.run(t, JSON.stringify(filtro), fim + PASSO).lastInsertRowid
	);
}

/** false = o filtro não existe (404 na UI). */
export function atualizarFiltro(db: Database.Database, id: number, nome: unknown, entradaFiltro: unknown): boolean {
	const t = titulo(nome);
	const filtro = parseFiltro(entradaFiltro);
	return db.prepare('UPDATE saved_filters SET title = ?, filter = ? WHERE id = ?').run(t, JSON.stringify(filtro), id).changes > 0;
}

export const apagarFiltro = (db: Database.Database, id: number) =>
	db.prepare('DELETE FROM saved_filters WHERE id = ?').run(id).changes > 0;

/** Sobe (-1) ou desce (+1) um filtro salvo uma casa na ordem da sidebar (igual a `moverProjeto`). */
export const moverFiltro = (db: Database.Database, id: number, delta: -1 | 1) =>
	db.transaction(() => {
		const ids = db.prepare('SELECT id FROM saved_filters ORDER BY position, id').pluck().all() as number[];
		const i = ids.indexOf(id);
		const j = i + delta;
		if (i < 0 || j < 0 || j >= ids.length) return i >= 0;
		[ids[i], ids[j]] = [ids[j], ids[i]];
		const set = db.prepare('UPDATE saved_filters SET position = ? WHERE id = ?');
		ids.forEach((fid, k) => set.run((k + 1) * PASSO, fid));
		return true;
	})();

/** null = o filtro não existe (404 na UI). Revalida na leitura: o banco pode ter sido editado à mão. */
export function buscarFiltro(db: Database.Database, id: number): { id: number; title: string; filtro: Filtro } | null {
	const row = db.prepare('SELECT id, title, filter FROM saved_filters WHERE id = ?').get(id) as
		| { id: number; title: string; filter: string }
		| undefined;
	return row ? { id: row.id, title: row.title, filtro: parseFiltro(JSON.parse(row.filter)) } : null;
}
