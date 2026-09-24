import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** GET /api/labels → todas as labels globais (#9), para o seletor do painel. */
export const GET: RequestHandler = () =>
	json(db.prepare('SELECT id, title, hex_color FROM labels ORDER BY title COLLATE NOCASE').all());
