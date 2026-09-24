import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { FiltroInvalido, Invalido, apagarFiltro, atualizarFiltro, buscarFiltro, formParaFiltro } from '$lib/server/filtros-salvos';
import type { Actions, PageServerLoad } from './$types';

function idDe(x: string): number {
	const id = Number(x);
	if (!Number.isSafeInteger(id) || id <= 0) error(400, 'id inválido');
	return id;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const filtro = buscarFiltro(db, idDe(params.id));
	if (!filtro) error(404, 'filtro não existe');
	const { projetos } = await parent();
	return {
		filtro,
		projetos: projetos.filter((p) => !p.archived),
		labels: db.prepare('SELECT id, title FROM labels ORDER BY title').all() as { id: number; title: string }[]
	};
};

export const actions: Actions = {
	salvar: async ({ request, params }) => {
		const id = idDe(params.id);
		const f = await request.formData();
		try {
			if (!atualizarFiltro(db, id, f.get('title'), formParaFiltro(f))) error(404, 'filtro não existe');
		} catch (e) {
			if (e instanceof Invalido || e instanceof FiltroInvalido) return fail(400, { erro: e.message });
			throw e;
		}
		redirect(303, `/?filtro=${id}`);
	},
	apagar: async ({ params }) => {
		if (!apagarFiltro(db, idDe(params.id))) error(404, 'filtro não existe');
		redirect(303, '/filtros');
	}
};
