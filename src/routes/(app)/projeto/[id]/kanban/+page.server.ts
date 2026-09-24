import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listarKanban } from '$lib/server/views';
import type { PageServerLoad } from './$types';

/** Kanban do projeto (#6): buckets em ordem, cards por posição. */
export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const buckets = listarKanban(db, id);
	if (!buckets) error(404, 'projeto não existe');
	return { buckets };
};
