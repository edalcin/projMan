import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { FiltroInvalido, Invalido, criarFiltro, formParaFiltro } from '$lib/server/filtros-salvos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { projetos } = await parent();
	return {
		projetos: projetos.filter((p) => !p.archived),
		labels: db.prepare('SELECT id, title FROM labels ORDER BY title').all() as { id: number; title: string }[]
	};
};

export const actions: Actions = {
	salvar: async ({ request }) => {
		const f = await request.formData();
		let id: number;
		try {
			id = criarFiltro(db, f.get('title'), formParaFiltro(f));
		} catch (e) {
			if (e instanceof Invalido || e instanceof FiltroInvalido) return fail(400, { erro: e.message });
			throw e;
		}
		redirect(303, `/?filtro=${id}`);
	}
};
