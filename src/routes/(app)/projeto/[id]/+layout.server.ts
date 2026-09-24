import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

/** Página do projeto (#5, #6): três abas List/Kanban/Table. 404 se o projeto não existe. */
export const load: LayoutServerLoad = ({ params }) => {
	const id = Number(params.id);
	const projeto = Number.isSafeInteger(id)
		? (db.prepare('SELECT id, title, archived FROM projects WHERE id = ?').get(id) as
				| { id: number; title: string; archived: number }
				| undefined)
		: undefined;
	if (!projeto) error(404, 'projeto não existe');
	return { projeto };
};
