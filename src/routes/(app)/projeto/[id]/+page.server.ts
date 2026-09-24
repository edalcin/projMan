import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listarList } from '$lib/server/views';
import type { PageServerLoad } from './$types';

/** List do projeto (#5): abertas por padrão, `?feitas=1` mostra as feitas. */
export const load: PageServerLoad = ({ params, url }) => {
	const id = Number(params.id);
	const feitas = url.searchParams.get('feitas') === '1';
	const tarefas = listarList(db, id, { feitas });
	if (!tarefas) error(404, 'projeto não existe');
	const viewId = db.prepare(`SELECT id FROM project_views WHERE project_id = ? AND view_kind = 'list'`).pluck().get(id) as number;
	return { tarefas, feitas, viewId };
};
