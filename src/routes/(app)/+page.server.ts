import { error, redirect } from '@sveltejs/kit';
import { SMART_LISTS } from '$lib/listas';
import { db } from '$lib/server/db';
import { FiltroInvalido, listarTarefas, resolverFiltro } from '$lib/server/filtro';
import { TZ } from '$lib/server/tz';
import type { PageServerLoad } from './$types';

/**
 * Lista de tarefas da smart list, do filtro salvo ou do projeto na URL. A
 * primeira página vem no SSR; as seguintes, de /api/tarefas (rolagem infinita).
 */
export const load: PageServerLoad = async ({ url, parent }) => {
	if (!url.search) redirect(307, '/?lista=hoje');
	let r;
	try {
		r = resolverFiltro(db, url.searchParams);
	} catch (e) {
		if (e instanceof FiltroInvalido) error(400, e.message);
		throw e;
	}
	if (!r) error(404, 'lista não existe');

	const { projetos, filtros } = await parent();
	const q = url.searchParams;
	const titulo =
		SMART_LISTS.find((l) => l.chave === q.get('lista'))?.nome ??
		filtros.find((f) => f.id === Number(q.get('filtro')))?.title ??
		projetos.find((p) => p.id === Number(q.get('projeto')))?.title;
	if (!titulo) error(404, 'lista não existe');

	return { titulo, ...listarTarefas(db, r.filtro, { tz: TZ, arquivados: r.arquivados }) };
};
