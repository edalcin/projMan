import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	Invalido,
	apagarLabel,
	apagarProjeto,
	atualizarProjeto,
	cor,
	criarProjeto,
	moverProjeto,
	salvarLabel,
	titulo
} from '$lib/server/projetos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	labels: db.prepare('SELECT id, title, hex_color FROM labels ORDER BY title').all() as {
		id: number;
		title: string;
		hex_color: string | null;
	}[]
});

function idDe(f: FormData): number {
	const id = Number(f.get('id'));
	if (!Number.isSafeInteger(id) || id <= 0) error(400, 'id inválido');
	return id;
}

/**
 * Cada action recebe o form, aplica e devolve `fail(400, { erro })` para entrada
 * inválida ou 404 para id que não existe. Os projetos da sidebar vêm do layout:
 * o `enhance` do cliente reexecuta todos os `load` depois da action.
 */
function acao(fn: (f: FormData) => boolean | void) {
	return async ({ request }: { request: Request }) => {
		try {
			if (fn(await request.formData()) === false) error(404, 'não existe');
		} catch (e) {
			if (e instanceof Invalido) return fail(400, { erro: e.message });
			throw e;
		}
	};
}

export const actions: Actions = {
	criar: acao((f) => void criarProjeto(db, titulo(f.get('title')))),
	renomear: acao((f) => atualizarProjeto(db, idDe(f), { title: titulo(f.get('title')) })),
	arquivar: acao((f) => atualizarProjeto(db, idDe(f), { archived: f.get('archived') === '1' ? 1 : 0 })),
	mover: acao((f) => moverProjeto(db, idDe(f), f.get('delta') === '-1' ? -1 : 1)),
	apagar: acao((f) => apagarProjeto(db, idDe(f))),
	label: acao((f) =>
		salvarLabel(db, f.get('id') ? idDe(f) : null, titulo(f.get('title')), cor(f.get('hex_color')))
	),
	apagarLabel: acao((f) => apagarLabel(db, idDe(f)))
};
