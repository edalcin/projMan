import { redirect } from '@sveltejs/kit';
import { COOKIE } from '$lib/server/sessao';
import type { RequestHandler } from './$types';

// POST só: um GET de logout seria disparável por <img src="/logout"> de qualquer página.
export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(COOKIE, { path: '/' });
	redirect(303, '/login');
};
