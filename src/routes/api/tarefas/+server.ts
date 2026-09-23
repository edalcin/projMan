import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { FiltroInvalido, listarTarefas, resolverFiltro } from '$lib/server/filtro';
import { TZ } from '$lib/server/tz';
import type { RequestHandler } from './$types';

/**
 * GET /api/tarefas?lista=<smart>|filtro=<id>|projeto=<id>&cursor=<c>
 * Uma página (50) de tarefas; `cursor` na resposta pede a próxima (rolagem infinita).
 */
export const GET: RequestHandler = ({ url }) => {
	try {
		const r = resolverFiltro(db, url.searchParams);
		if (!r) error(400, 'use lista=<smart>, filtro=<id> ou projeto=<id>');
		return json(
			listarTarefas(db, r.filtro, { tz: TZ, arquivados: r.arquivados, cursor: url.searchParams.get('cursor') ?? undefined })
		);
	} catch (e) {
		if (e instanceof FiltroInvalido) error(400, e.message);
		throw e;
	}
};
