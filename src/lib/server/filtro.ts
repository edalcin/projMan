import type Database from 'better-sqlite3';
import { limitesDoDia, somarCiclo } from '../datas.ts';

/**
 * Filtro salvo, versão 1 (#11). Só AND entre campos. Campo ausente = sem
 * restrição. As smart lists são filtros deste mesmo formato (SMART, abaixo):
 * um caminho só de validação, SQL e paginação.
 */
export type Filtro = {
	v: 1;
	estado?: 'abertas' | 'feitas' | 'todas'; // default: abertas
	projetos?: number[];
	labels?: { in?: number[]; notIn?: number[]; nenhuma?: true }; // nenhuma: sem label alguma (#15)
	prioridadeMin?: number; // 1..5
	prazo?: { tipo: 'atrasadas' | 'hoje' | 'sem' } | { tipo: 'proximos'; dias: number };
	texto?: string;
	criadaHaMaisDe?: number; // dias, 1..3650 (#15)
};

export const SMART = {
	hoje: { v: 1, prazo: { tipo: 'hoje' } },
	'7-dias': { v: 1, prazo: { tipo: 'proximos', dias: 7 } },
	atrasadas: { v: 1, prazo: { tipo: 'atrasadas' } },
	'sem-prazo': { v: 1, prazo: { tipo: 'sem' } },
	abertas: { v: 1 }
} satisfies Record<string, Filtro>;

export class FiltroInvalido extends Error {}

const ids = (x: unknown, campo: string): number[] => {
	if (!Array.isArray(x) || x.length === 0 || x.length > 200 || !x.every((n) => Number.isSafeInteger(n) && n > 0))
		throw new FiltroInvalido(`${campo}: lista de 1 a 200 ids inteiros positivos`);
	return x;
};

const objeto = (x: unknown, campo: string, chaves: string[]): Record<string, unknown> => {
	if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new FiltroInvalido(`${campo}: objeto esperado`);
	const extra = Object.keys(x).filter((k) => !chaves.includes(k));
	if (extra.length) throw new FiltroInvalido(`${campo}: campo desconhecido ${extra.join(', ')}`);
	return x as Record<string, unknown>;
};

/**
 * Valida a entrada (corpo da requisição ou coluna `filter`) e devolve um Filtro
 * limpo. Campo desconhecido é erro, não é ignorado: um typo no cliente não pode
 * virar um filtro silenciosamente mais largo.
 */
export function parseFiltro(entrada: unknown): Filtro {
	const o = objeto(entrada, 'filtro', ['v', 'estado', 'projetos', 'labels', 'prioridadeMin', 'prazo', 'texto', 'criadaHaMaisDe']);
	if (o.v !== 1) throw new FiltroInvalido('v: só a versão 1 existe');
	const f: Filtro = { v: 1 };
	if (o.estado !== undefined) {
		if (o.estado !== 'abertas' && o.estado !== 'feitas' && o.estado !== 'todas')
			throw new FiltroInvalido('estado: abertas | feitas | todas');
		f.estado = o.estado;
	}
	if (o.projetos !== undefined) f.projetos = ids(o.projetos, 'projetos');
	if (o.labels !== undefined) {
		const l = objeto(o.labels, 'labels', ['in', 'notIn', 'nenhuma']);
		f.labels = {};
		if (l.in !== undefined) f.labels.in = ids(l.in, 'labels.in');
		if (l.notIn !== undefined) f.labels.notIn = ids(l.notIn, 'labels.notIn');
		if (l.nenhuma !== undefined) {
			if (l.nenhuma !== true) throw new FiltroInvalido('labels.nenhuma: só true');
			if (f.labels.in) throw new FiltroInvalido('labels.nenhuma: não combina com labels.in');
			f.labels.nenhuma = true;
		}
	}
	if (o.prioridadeMin !== undefined) {
		if (!Number.isInteger(o.prioridadeMin) || (o.prioridadeMin as number) < 1 || (o.prioridadeMin as number) > 5)
			throw new FiltroInvalido('prioridadeMin: inteiro de 1 a 5');
		f.prioridadeMin = o.prioridadeMin as number;
	}
	if (o.prazo !== undefined) {
		const p = objeto(o.prazo, 'prazo', ['tipo', 'dias']);
		if (p.tipo === 'proximos') {
			if (!Number.isInteger(p.dias) || (p.dias as number) < 1 || (p.dias as number) > 366)
				throw new FiltroInvalido('prazo.dias: inteiro de 1 a 366');
			f.prazo = { tipo: 'proximos', dias: p.dias as number };
		} else if (p.tipo === 'atrasadas' || p.tipo === 'hoje' || p.tipo === 'sem') {
			if (p.dias !== undefined) throw new FiltroInvalido('prazo.dias: só com tipo proximos');
			f.prazo = { tipo: p.tipo };
		} else throw new FiltroInvalido('prazo.tipo: atrasadas | hoje | proximos | sem');
	}
	if (o.texto !== undefined) {
		if (typeof o.texto !== 'string' || o.texto.length > 200) throw new FiltroInvalido('texto: até 200 caracteres');
		if (o.texto.trim()) f.texto = o.texto.trim();
	}
	if (o.criadaHaMaisDe !== undefined) {
		if (!Number.isInteger(o.criadaHaMaisDe) || (o.criadaHaMaisDe as number) < 1 || (o.criadaHaMaisDe as number) > 3650)
			throw new FiltroInvalido('criadaHaMaisDe: inteiro de 1 a 3650 dias');
		f.criadaHaMaisDe = o.criadaHaMaisDe as number;
	}
	return f;
}

/**
 * Texto livre → expressão FTS5 segura: cada palavra vira um termo entre aspas
 * com prefixo (`"herb"*`). Aspas internas são dobradas. Operadores do FTS5
 * (AND, NEAR, col:) digitados pelo usuário viram texto, nunca sintaxe.
 */
export const expressaoFts = (texto: string) =>
	texto
		.split(/\s+/)
		.filter(Boolean)
		.map((t) => `"${t.replaceAll('"', '""')}"*`)
		.join(' ');

type Cursor = [chave: string, id: number];
const PAGINA = 50;

export type Linha = {
	id: number;
	project_id: number;
	projeto: string;
	parent_task_id: number | null;
	mae: string | null;
	title: string;
	done: number;
	due_date: string | null;
	due_all_day: number;
	priority: number;
};

/**
 * Tarefas que casam com o filtro, em páginas de 50 para a rolagem infinita.
 * Ordem: prazo (sem prazo por último), depois id. Paginação por cursor
 * (keyset), nunca por OFFSET: um item concluído entre duas páginas não faz
 * outro pular nem repetir.
 *
 * Todo fragmento SQL abaixo é fixo; valores entram só por parâmetro.
 */
export function listarTarefas(
	db: Database.Database,
	filtro: Filtro,
	{ tz, agora = Date.now(), cursor, arquivados = false }: { tz: string; agora?: number; cursor?: string; arquivados?: boolean }
): { tarefas: Linha[]; cursor: string | null } {
	// projeto arquivado some das listas e dos filtros; só a página do próprio projeto o mostra
	const onde = arquivados ? ['1'] : ['p.archived = 0'];
	const params: unknown[] = [];

	const estado = filtro.estado ?? 'abertas';
	if (estado !== 'todas') onde.push(estado === 'abertas' ? 't.done = 0' : 't.done = 1');

	if (filtro.projetos) {
		onde.push(`t.project_id IN (${filtro.projetos.map(() => '?').join(',')})`);
		params.push(...filtro.projetos);
	}
	if (filtro.labels?.in) {
		onde.push(
			`EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id IN (${filtro.labels.in.map(() => '?').join(',')}))`
		);
		params.push(...filtro.labels.in);
	}
	if (filtro.labels?.notIn) {
		onde.push(
			`NOT EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id IN (${filtro.labels.notIn.map(() => '?').join(',')}))`
		);
		params.push(...filtro.labels.notIn);
	}
	if (filtro.labels?.nenhuma) {
		onde.push('NOT EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id)');
	}
	if (filtro.criadaHaMaisDe) {
		onde.push('t.created_at < ?');
		params.push(new Date(agora - filtro.criadaHaMaisDe * 86_400_000).toISOString());
	}
	if (filtro.prioridadeMin) {
		onde.push('t.priority >= ?');
		params.push(filtro.prioridadeMin);
	}
	if (filtro.prazo) {
		const iso = (ms: number) => new Date(ms).toISOString();
		const hoje = limitesDoDia(agora, tz);
		const p = filtro.prazo;
		if (p.tipo === 'sem') onde.push('t.due_date IS NULL');
		else if (p.tipo === 'atrasadas') {
			onde.push('t.due_date < ?');
			params.push(iso(hoje.inicio));
		} else {
			// hoje = [início de hoje, fim de hoje]; proximos N = [início de hoje, fim do dia hoje+N]
			const fim = p.tipo === 'proximos' ? limitesDoDia(somarCiclo(agora, p.dias, 'day', tz), tz).fim : hoje.fim;
			onde.push('t.due_date BETWEEN ? AND ?');
			params.push(iso(hoje.inicio), iso(fim));
		}
	}
	if (filtro.texto) {
		const q = expressaoFts(filtro.texto);
		if (q) {
			onde.push('t.id IN (SELECT rowid FROM tasks_fts WHERE tasks_fts MATCH ?)');
			params.push(q);
		}
	}

	// ponytail: '~' ordena depois de qualquer ISO-8601, pondo "sem prazo" no fim.
	// A expressão impede o índice de prazo na ordenação; com milhares de tarefas
	// de um usuário, irrelevante. Se doer: duas consultas (com prazo, sem prazo).
	const chave = "coalesce(t.due_date, '~')";
	if (cursor) {
		const [c, id] = lerCursor(cursor);
		onde.push(`(${chave} > ? OR (${chave} = ? AND t.id > ?))`);
		params.push(c, c, id);
	}

	const linhas = db
		.prepare(
			`SELECT t.id, t.project_id, p.title AS projeto, t.parent_task_id, m.title AS mae,
			        t.title, t.done, t.due_date, t.due_all_day, t.priority, ${chave} AS chave
			 FROM tasks t
			 JOIN projects p ON p.id = t.project_id
			 LEFT JOIN tasks m ON m.id = t.parent_task_id
			 WHERE ${onde.join(' AND ')}
			 ORDER BY ${chave}, t.id
			 LIMIT ${PAGINA + 1}`
		)
		.all(...params) as (Linha & { chave: string })[];

	const temMais = linhas.length > PAGINA;
	const pagina = linhas.slice(0, PAGINA);
	const ultima = pagina.at(-1);
	return {
		tarefas: pagina.map(({ chave: _, ...t }) => t),
		cursor: temMais && ultima ? Buffer.from(JSON.stringify([ultima.chave, ultima.id])).toString('base64url') : null
	};
}

function lerCursor(cursor: string): Cursor {
	try {
		const c: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
		if (Array.isArray(c) && c.length === 2 && typeof c[0] === 'string' && Number.isSafeInteger(c[1]))
			return [c[0], c[1]];
	} catch {
		// cai no erro abaixo
	}
	throw new FiltroInvalido('cursor inválido');
}

/**
 * Consulta da URL → filtro: `lista=<smart>`, `filtro=<id salvo>` ou `projeto=<id>`.
 * Ponto único da página e da API. `projeto` mostra também projeto arquivado
 * (a sidebar leva até ele); smart lists e filtros continuam sem arquivados (#11).
 */
export function resolverFiltro(
	db: Database.Database,
	q: URLSearchParams
): { filtro: Filtro; arquivados: boolean } | null {
	const lista = q.get('lista');
	if (lista && Object.hasOwn(SMART, lista)) return { filtro: SMART[lista as keyof typeof SMART], arquivados: false };
	const id = q.get('filtro');
	if (id && /^\d+$/.test(id)) {
		const salvo = db.prepare('SELECT filter FROM saved_filters WHERE id = ?').pluck().get(+id);
		// revalida na leitura: o banco pode ter sido editado à mão
		return typeof salvo === 'string' ? { filtro: parseFiltro(JSON.parse(salvo)), arquivados: false } : null;
	}
	const projeto = q.get('projeto');
	if (projeto && /^\d+$/.test(projeto)) return { filtro: { v: 1, projetos: [+projeto] }, arquivados: true };
	return null;
}
