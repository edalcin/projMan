import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { feedIcal, tokenValido } from '$lib/server/ical';
import type { RequestHandler } from './$types';

import { TZ } from '$lib/server/tz';

/**
 * GET /ical/<ICAL_TOKEN> — feed de calendário (#12). Público: o cliente de
 * calendário não faz login. Revogar = trocar ICAL_TOKEN e reiniciar.
 */
export const GET: RequestHandler = ({ params }) => {
	// mesmo 404 para token errado e feed desligado: não confirma nada
	if (!tokenValido(params.token, env.ICAL_TOKEN)) error(404);
	return new Response(feedIcal(db, TZ), {
		headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' }
	});
};
