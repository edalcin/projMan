import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listarTable } from '$lib/server/views';
import type { PageServerLoad } from './$types';

const ORDENS = ['titulo', 'prazo', 'prioridade'];

/** Table do projeto (#5): colunas fixas, ordenação pela URL (`?ordem=`). */
export const load: PageServerLoad = ({ params, url }) => {
	const id = Number(params.id);
	const pedido = url.searchParams.get('ordem');
	const ordem = pedido && ORDENS.includes(pedido) ? pedido : 'prazo';
	const tarefas = listarTable(db, id, { ordem });
	if (!tarefas) error(404, 'projeto não existe');
	return { tarefas, ordem };
};
