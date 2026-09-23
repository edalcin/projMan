import { db } from '$lib/server/db';
import { TZ } from '$lib/server/tz';
import type { LayoutServerLoad } from './$types';

export type ProjetoMenu = { id: number; title: string; archived: number };
export type FiltroMenu = { id: number; title: string };

/** Sidebar (#14): projetos (ativos e arquivados) e filtros salvos, na ordem manual. */
export const load: LayoutServerLoad = () => ({
	tz: TZ,
	projetos: db.prepare('SELECT id, title, archived FROM projects ORDER BY position, id').all() as ProjetoMenu[],
	filtros: db.prepare('SELECT id, title FROM saved_filters ORDER BY position, id').all() as FiltroMenu[]
});
