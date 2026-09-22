import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { FiltroInvalido, SMART, listarTarefas, parseFiltro } from '$lib/server/filtro';
import type { RequestHandler } from './$types';

// Fuso do processo = TZ do container (#8). O Node traz ICU completo: resolve
// nomes de fuso mesmo sem tzdata no Alpine.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * GET /api/tarefas?lista=<smart>|filtro=<id>&cursor=<c>
 * Uma página (50) de tarefas; `cursor` na resposta pede a próxima (rolagem infinita).
 */
export const GET: RequestHandler = ({ url }) => {
	const lista = url.searchParams.get('lista');
	const filtroId = url.searchParams.get('filtro');
	try {
		let filtro;
		if (lista && Object.hasOwn(SMART, lista)) filtro = SMART[lista as keyof typeof SMART];
		else if (filtroId && /^\d+$/.test(filtroId)) {
			const salvo = db.prepare('SELECT filter FROM saved_filters WHERE id = ?').pluck().get(+filtroId);
			if (typeof salvo !== 'string') error(404, 'filtro não existe');
			// revalida na leitura: o JSON gravado passou pelo mesmo validador, mas o
			// banco pode ter sido editado à mão ou vir de uma versão antiga
			filtro = parseFiltro(JSON.parse(salvo));
		} else error(400, `use lista=${Object.keys(SMART).join('|')} ou filtro=<id>`);
		return json(listarTarefas(db, filtro, { tz: TZ, cursor: url.searchParams.get('cursor') ?? undefined }));
	} catch (e) {
		if (e instanceof FiltroInvalido) error(400, e.message);
		throw e;
	}
};
