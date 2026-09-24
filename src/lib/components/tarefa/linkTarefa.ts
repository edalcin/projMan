/** URL atual + `tarefa=<id>` (#14): abre o painel de detalhe sem perder a lista/filtro corrente. */
export function linkTarefa(url: URL, id: number): string {
	const u = new URL(url);
	u.searchParams.set('tarefa', String(id));
	return u.pathname + u.search;
}
