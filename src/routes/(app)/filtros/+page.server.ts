import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { apagarFiltro, moverFiltro } from '$lib/server/filtros-salvos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	filtros: db.prepare('SELECT id, title FROM saved_filters ORDER BY position, id').all() as { id: number; title: string }[]
});

function idDe(f: FormData): number {
	const id = Number(f.get('id'));
	if (!Number.isSafeInteger(id) || id <= 0) error(400, 'id inválido');
	return id;
}

export const actions: Actions = {
	mover: async ({ request }) => {
		const f = await request.formData();
		if (!moverFiltro(db, idDe(f), f.get('delta') === '-1' ? -1 : 1)) error(404, 'não existe');
	},
	apagar: async ({ request }) => {
		const f = await request.formData();
		if (!apagarFiltro(db, idDe(f))) error(404, 'não existe');
	}
};
